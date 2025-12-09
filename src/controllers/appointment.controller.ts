import { AppointmentRepository } from '@/repositories/appointment.repository'
import { CreateAppointmentSchema, UpdateAppointmentSchema, AppointmentIdSchema } from '@/schemas/appointment.schema'
import { createDailyService } from '@/services/daily.service'
import { auditService } from '@/services/audit.service'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export class AppointmentController {
	private appointmentRepository: AppointmentRepository
	private dailyService: ReturnType<typeof createDailyService>

	constructor(_fastify: FastifyInstance) {
		this.appointmentRepository = new AppointmentRepository()
		this.dailyService = createDailyService()
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			/* if (req.user !== 'master' && req.user?.role !== 'admin' && req.user?.role !== 'doctor') {
				return res.status(403).send({ error: 'Insufficient permissions to create appointment' })
			} */

			const data = CreateAppointmentSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const patientExists = await this.appointmentRepository.checkPatientExists(data.data.patientId)

			if (!patientExists) {
				return res.status(404).send({ error: 'Patient not found' })
			}

			const doctorExists = await this.appointmentRepository.checkDoctorExists(data.data.doctorId)

			if (!doctorExists) {
				return res.status(404).send({ error: 'Doctor not found' })
			}

			const appointmentDate = new Date(data.data.appointmentDate)
			const conflict = await this.appointmentRepository.checkConflict(
				data.data.patientId,
				data.data.doctorId,
				appointmentDate,
			)

			if (conflict) {
				return res.status(409).send({ error: 'Appointment already exists for this date and time' })
			}

		// Criar sala no Daily.co
		const roomName = `appointment-${Date.now()}-${data.data.patientId.slice(0, 8)}`
		let dailyRoom: { roomName: string; url: string }

		try {
			dailyRoom = await this.dailyService.createRoom(roomName, 'temp-id')
			} catch (error) {
				console.error('Error creating Daily.co room:', error)
				return res.status(500).send({ error: 'Failed to create video room' })
			}

			const appointment = await this.appointmentRepository.create({
				...data.data,
				roomName: dailyRoom.roomName,
			})

			// Gerar tokens de acesso para paciente e médico
			let patientToken: string | undefined
			let doctorToken: string | undefined

			try {
				patientToken = await this.dailyService.generateToken(
					dailyRoom.roomName,
					data.data.patientId,
					'patient',
					{
						userName: patientExists.user.name,
						expiresIn: 86400, // 24 horas
					},
				)

				doctorToken = await this.dailyService.generateToken(
					dailyRoom.roomName,
					data.data.doctorId,
					'doctor',
					{
						userName: doctorExists.user.name,
						expiresIn: 86400, // 24 horas
					},
				)
			} catch (error) {
				console.error('Error generating tokens:', error)
			}

			// Registra a criação da consulta no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logAppointmentCreate(
					req.user.id,
					appointment.id,
					data.data.patientId,
					data.data.doctorId,
					req.auditContext
				)
			}

			return res.status(201).send({
				message: 'Appointment created successfully',
				data: {
					appointment,
					roomUrl: dailyRoom.url,
					patientToken,
					doctorToken,
				},
			})
		} catch (error) {
			console.error('Error creating appointment:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			/* if (req.user !== 'master' && req.user?.role !== 'admin' && req.user?.role !== 'doctor') {
				return res.status(403).send({ error: 'Insufficient permissions to update appointment' })
			} */

			const params = AppointmentIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid appointment ID', details: params.error })
			}

			const data = UpdateAppointmentSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingAppointment = await this.appointmentRepository.findById(params.data.id)

			if (!existingAppointment) {
				return res.status(404).send({ error: 'Appointment not found' })
			}

			let newRoomName: string | undefined

			// Se a data da consulta mudou, criar nova sala
			if (data.data.appointmentDate) {
				const newDate = new Date(data.data.appointmentDate)
				const oldDate = new Date(existingAppointment.appointmentDate)

				if (newDate.getTime() !== oldDate.getTime()) {
					// Deletar sala antiga se existir
					if (existingAppointment.roomName) {
						try {
							await this.dailyService.deleteRoom(existingAppointment.roomName)
						} catch (error) {
							console.error('Error deleting old room:', error)
						}
					}

					// Criar nova sala
					const roomName = `appointment-${Date.now()}-${existingAppointment.patientId.slice(0, 8)}`
					try {
						const dailyRoom = await this.dailyService.createRoom(roomName, params.data.id)
						newRoomName = dailyRoom.roomName
					} catch (error) {
						console.error('Error creating new Daily.co room:', error)
						return res.status(500).send({ error: 'Failed to create new video room' })
					}
				}
			}

			const updatedAppointment = await this.appointmentRepository.update(params.data.id, {
				...data.data,
				...(newRoomName && { roomName: newRoomName }),
			})

			// Gerar novos tokens se a sala foi recriada
			let patientToken: string | undefined
			let doctorToken: string | undefined

			if (newRoomName && updatedAppointment.patient && updatedAppointment.doctor) {
				try {
					patientToken = await this.dailyService.generateToken(
						newRoomName,
						updatedAppointment.patientId,
						'patient',
						{
							userName: updatedAppointment.patient.user.name,
							expiresIn: 86400,
						},
					)

					doctorToken = await this.dailyService.generateToken(
						newRoomName,
						updatedAppointment.doctorId,
						'doctor',
						{
							userName: updatedAppointment.doctor.user.name,
							expiresIn: 86400,
						},
					)
				} catch (error) {
					console.error('Error generating new tokens:', error)
				}
			}

			// Registra a atualização da consulta no log de auditoria
			if (req.user?.id && req.auditContext) {
				// Verificar se foi cancelamento
				if (data.data.status === 'cancelled') {
					await auditService.logAppointmentCancel(
						req.user.id,
						params.data.id,
						req.auditContext
					)
				} else if (data.data.status === 'completed') {
					await auditService.logAppointmentComplete(
						req.user.id,
						params.data.id,
						req.auditContext
					)
				} else {
					await auditService.logAppointmentUpdate(
						req.user.id,
						params.data.id,
						data.data,
						req.auditContext
					)
				}
			}

			return res.status(200).send({
				message: 'Appointment updated successfully',
				data: {
					appointment: updatedAppointment,
					...(newRoomName && {
						roomUrl: `https://${process.env.DAILY_DOMAIN || 'medvision.daily.co'}/${newRoomName}`,
						patientToken,
						doctorToken,
					}),
				},
			})
		} catch (error) {
			console.error('Error updating appointment:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
