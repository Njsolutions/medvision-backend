import { AppointmentRepository } from '@/repositories/appointment.repository'
import { DoctorRepository } from '@/repositories/doctor.repository'
import { UtiRepository } from '@/repositories/uti.repository'
import { 
	CreateAppointmentSchema, 
	UpdateAppointmentSchema, 
	AppointmentIdSchema, 
	ListAppointmentsSchema,
	AddPatientFeedbackSchema,
	AddDoctorFeedbackSchema 
} from '@/schemas/appointment.schema'
import { createDailyService } from '@/services/daily.service'
import { auditService } from '@/services/audit.service'
import { ImpactLevel } from '@/types/audit.types'
import { storageService } from '@/services/storage.service'
import { cronService } from '@/services/cron.service'
import { validateDoctorAvailability, formatWeeklyAvailability } from '@/utils/functions/availability'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export class AppointmentController {
	private appointmentRepository: AppointmentRepository
	private doctorRepository: DoctorRepository
	private utiRepository: UtiRepository
	private dailyService: ReturnType<typeof createDailyService>

	constructor(_fastify: FastifyInstance) {
		this.appointmentRepository = new AppointmentRepository()
		this.doctorRepository = new DoctorRepository()
		this.utiRepository = new UtiRepository()
		this.dailyService = createDailyService()
	}

	private async formatFiles(files: any[]) {
		return Promise.all(
			files.map(async (file) => {
				const url = await storageService.getSignedUrl(file.storageKey)
				return {
					id: file.id,
					fileName: file.fileName,
					fileType: file.fileType,
					mimeType: file.mimeType,
					uploadedAt: file.createdAt,
					uploadedBy: file.uploadedByUser ? {
						id: file.uploadedByUser.id,
						name: file.uploadedByUser.name,
						email: file.uploadedByUser.email,
					} : null,
					url,
				}
			})
		)
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user.role !== 'master' && req.user?.role !== 'admin' && req.user?.role !== 'doctor') {
				return res.status(403).send({ 
					error: 'Permissão negada',
					message: 'Você não possui permissão para criar consultas'
				})
			}

			const data = CreateAppointmentSchema.safeParse(req.body)

			if (!data.success) {
			const errorMessages = data.error.issues?.map((err: any) => err.message).join(', ') || 'Dados inválidos'
			return res.status(400).send({ 
				error: 'Dados inválidos', 
				message: errorMessages,
				details: data.error 
			})
		}

		const patientExists = await this.appointmentRepository.checkPatientExists(data.data.patientId)

	if (!patientExists) {
		return res.status(404).send({ 
			error: 'Paciente não encontrado',
			message: 'O paciente especificado não existe no sistema'
		})
	}

	const doctorExists = await this.appointmentRepository.checkDoctorExists(data.data.doctorId)

	if (!doctorExists) {
		return res.status(404).send({ 
			error: 'Médico não encontrado',
			message: 'O médico especificado não existe no sistema'
		})
	}

	// Validar disponibilidade do médico
	const appointmentDate = new Date(data.data.appointmentDate)
	
	console.log('🔍 Validando disponibilidade do médico:', {
		doctorId: data.data.doctorId,
		doctorName: doctorExists.user.name,
		appointmentDate: appointmentDate.toISOString(),
		localDate: appointmentDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
		dayOfWeek: appointmentDate.getDay(),
		hours: appointmentDate.getHours(),
		minutes: appointmentDate.getMinutes(),
		weeklyAvailability: doctorExists.weeklyAvailability
	})
	
	const availabilityCheck = validateDoctorAvailability(
		doctorExists.weeklyAvailability,
		appointmentDate,
		data.data.durationMinutes
	)

	if (!availabilityCheck.isAvailable) {
		const schedule = formatWeeklyAvailability(doctorExists.weeklyAvailability)
		console.log('❌ Médico indisponível:', availabilityCheck.message)
		return res.status(400).send({ 
			error: 'Horário indisponível',
			message: availabilityCheck.message,
			doctorName: doctorExists.user.name,
			doctorSchedule: schedule
		})
	}

	console.log('✅ Médico disponível no horário solicitado')

	// Verificar conflitos de horário
			const conflict = await this.appointmentRepository.checkConflict(
				data.data.patientId,
				data.data.doctorId,
				appointmentDate,
				data.data.durationMinutes
			)

			if (conflict) {
			const schedule = formatWeeklyAvailability(doctorExists.weeklyAvailability)
			const conflictType = conflict.doctorId === data.data.doctorId ? 'médico' : 'paciente'
			const conflictTime = new Date(conflict.appointmentDate).toLocaleString('pt-BR', { 
				timeZone: 'America/Sao_Paulo',
				hour: '2-digit',
				minute: '2-digit'
			})
			
			console.log('❌ Conflito de horário detectado:', {
				conflictType,
				conflictingAppointmentId: conflict.id,
				conflictTime
			})
			
			return res.status(409).send({ 
				error: 'Conflito de horário',
			message: `Já existe uma consulta agendada para este ${conflictType} no horário ${conflictTime}. Escolha outro horário disponível.`,
			doctorName: doctorExists.user.name,
			doctorSchedule: schedule,
			conflictDetails: {
				type: conflictType,
				time: conflictTime
			}
		})
	}

	// Criar sala no Daily.co
			const roomName = `appointment-${Date.now()}-${data.data.patientId.slice(0, 8)}`
			let dailyRoom: { roomName: string; url: string }

			try {
				dailyRoom = await this.dailyService.createRoom(roomName, 'temp-id')
			} catch (error) {
				console.error('Error creating Daily.co room:', error)
				return res.status(500).send({ 
					error: 'Erro ao criar sala de vídeo',
					message: 'Não foi possível criar a sala de vídeo para a consulta'
				})
			}

			const appointment = await this.appointmentRepository.create({
				...data.data,
				roomName: dailyRoom.roomName,
			roomLink: dailyRoom.url,
		})

		// Gerar tokens de acesso para paciente, médico e admin (se aplicável)
		let patientToken: string | undefined
		let doctorToken: string | undefined
		let adminToken: string | undefined

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

			// Gerar token para admin/master que está criando a consulta
			if (req.user?.role === 'admin' || req.user?.role === 'master') {
				adminToken = await this.dailyService.generateToken(
					dailyRoom.roomName,
					req.user.id,
					'admin',
					{
						userName: req.user.name || 'Admin',
						expiresIn: 86400, // 24 horas
					},
				)
			}
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

			// Formatar arquivos do paciente
			const appointmentWithFiles = {
				...appointment,
				patient: {
					...appointment.patient,
					files: appointment.patient.files ? await this.formatFiles(appointment.patient.files) : [],
				},
			}

			return res.status(201).send({
				message: 'Consulta criada com sucesso',
				data: {
					appointment: appointmentWithFiles,
					roomUrl: dailyRoom.url,
					patientToken,
					doctorToken,
					...(adminToken && { adminToken }),
				},
			})
		} catch (error) {
			console.error('Error creating appointment:', error)
			return res.status(500).send({ 
				error: 'Erro interno do servidor',
				message: 'Ocorreu um erro ao criar a consulta. Tente novamente.'
			})
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			/* if (req.user !== 'master' && req.user?.role !== 'admin' && req.user?.role !== 'doctor') {
				return res.status(403).send({ error: 'Insufficient permissions to update appointment' })
			} */

			const params = AppointmentIdSchema.safeParse(req.params)

			if (!params.success) {
			const errorMessages = params.error.issues?.map((err: any) => err.message).join(', ') || 'ID de consulta inválido'
		return res.status(400).send({ 
			error: 'ID de consulta inválido',
			message: errorMessages,
			details: params.error 
		})
	}

	const data = UpdateAppointmentSchema.safeParse(req.body)

	if (!data.success) {
		const errorMessages = data.error.errors?.map(err => err.message).join(', ') || 'Dados inválidos'
		return res.status(400).send({ 
			error: 'Dados inválidos',
			message: errorMessages,
			details: data.error 
		})
	}

	const existingAppointment = await this.appointmentRepository.findById(params.data.id)

if (!existingAppointment) {
	return res.status(404).send({ 
			message: 'A consulta especificada não existe no sistema'
		})
	}

	// Validar se a consulta já foi finalizada (não pode mais ser editada)
	const finalizedStatuses = ['cancelled', 'noShow', 'completed']
	if (finalizedStatuses.includes(existingAppointment.status)) {
		return res.status(400).send({ 
			error: 'Consulta finalizada',
			message: 'Consultas canceladas, concluídas ou com paciente ausente não podem ser editadas'
		})
	}

	let newRoomName: string | undefined
		// Se a data da consulta mudou, validar disponibilidade e criar nova sala
		if (data.data.appointmentDate) {
			const newDate = new Date(data.data.appointmentDate)
			const oldDate = new Date(existingAppointment.appointmentDate)
			
			// Validar disponibilidade do médico na nova data
			const doctorExists = await this.appointmentRepository.checkDoctorExists(existingAppointment.doctorId)
			
			if (!doctorExists) {
				return res.status(404).send({ 
					error: 'Médico não encontrado',
					message: 'O médico associado à consulta não existe no sistema'
				})
			}
			
			const newDuration = data.data.durationMinutes || existingAppointment.durationMinutes || 60
			
			const availabilityCheck = validateDoctorAvailability(
				doctorExists.weeklyAvailability,
				newDate,
				newDuration
			)

			if (!availabilityCheck.isAvailable) {
			const schedule = formatWeeklyAvailability(doctorExists.weeklyAvailability)
			return res.status(400).send({ 
				error: 'Horário indisponível',
				message: availabilityCheck.message,
				doctorName: doctorExists.user.name,
				doctorSchedule: schedule
			})
		}
			
			// Verificar conflitos na nova data
			const conflict = await this.appointmentRepository.checkConflict(
				existingAppointment.patientId,
				existingAppointment.doctorId,
				newDate,
				newDuration,
				params.data.id // Excluir a própria consulta
			)
			
			if (conflict) {
				const schedule = formatWeeklyAvailability(doctorExists.weeklyAvailability)
				const conflictType = conflict.doctorId === existingAppointment.doctorId ? 'médico' : 'paciente'
				return res.status(409).send({ 
					error: 'Conflito de horário',
					message: `Já existe uma consulta agendada para este ${conflictType} no novo horário escolhido.`,
					doctorName: doctorExists.user.name,
					doctorSchedule: schedule
				})
			}

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
					return res.status(500).send({ 
						error: 'Erro ao criar sala de vídeo',
						message: 'Não foi possível criar uma nova sala de vídeo para a consulta'
					})
				}
			}
		}

		// Verificar se a consulta está sendo finalizada (cancelada, noShow ou completed)
		// Se sim, deletar a sala
		if (data.data.status && ['cancelled', 'noShow', 'completed'].includes(data.data.status)) {
			if (existingAppointment.roomName) {
				try {
					await this.dailyService.deleteRoom(existingAppointment.roomName)
					console.log(`Room ${existingAppointment.roomName} deleted for appointment ${params.data.id}`)
				} catch (error) {
					console.error('Error deleting room on appointment finalization:', error)
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
				// Verificar qual tipo de atualização foi feita
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
				} else if (data.data.status === 'noShow') {
					await auditService.logAppointmentNoShow(
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
			message: 'Consulta atualizada com sucesso',
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
		return res.status(500).send({ 
			error: 'Erro interno do servidor',
			message: 'Ocorreu um erro ao atualizar a consulta. Tente novamente.'
		})
	}
}

async list(req: FastifyRequest, res: FastifyReply) {
	try {
		const query = ListAppointmentsSchema.safeParse(req.query)

		if (!query.success) {
			const errorMessages = query.error.issues?.map((err: any) => err.message).join(', ') || 'Parâmetros de consulta inválidos'
			return res.status(400).send({ 
				error: 'Parâmetros de consulta inválidos',
				message: errorMessages,
				details: query.error 
			})
		}

		const filters: {
				status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled' | 'noShow'
				patientId?: string
				doctorId?: string
				startDate?: Date
				endDate?: Date
				page: number
				limit: number
			} = {
				page: query.data.page,
				limit: query.data.limit,
			}

			if (query.data.status) {
				filters.status = query.data.status
			}

			if (query.data.patientId) {
				filters.patientId = query.data.patientId
			}

			// Se o usuário é médico, buscar automaticamente o doctorId pelo userId do token
			const isDoctor = req.user?.role === 'doctor'
			let doctorProfile = null
			if (isDoctor) {
				doctorProfile = await this.doctorRepository.findByUserId(req.user.id)
				if (!doctorProfile) {
					return res.status(404).send({ error: 'Doctor profile not found' })
				}
				filters.doctorId = doctorProfile.id
			} else if (query.data.doctorId) {
				filters.doctorId = query.data.doctorId
			}

			if (query.data.startDate) {
				filters.startDate = new Date(query.data.startDate)
			}

			if (query.data.endDate) {
				filters.endDate = new Date(query.data.endDate)
			}

			const result = await this.appointmentRepository.findAll(filters)

		// Buscar todas as UTIs ocupadas se o médico tiver acesso
		let utiAccess: any[] = []
		if (isDoctor && doctorProfile?.utiAccess) {
			const allUtis = await this.utiRepository.findAll()
			utiAccess = allUtis.filter(uti => uti.status === 'occupied')
		}

		// Formatar arquivos com URLs para cada appointment
		// Se for médico, remove os dados do próprio médico da resposta
		const appointmentsWithFiles = await Promise.all(
			result.appointments.map(async (appointment) => {
				// Se for médico, remover dados de contato e endereço do paciente
				let patientData = {
					...appointment.patient,
					files: appointment.patient.files ? await this.formatFiles(appointment.patient.files) : [],
					uti: undefined, // Remove a relação uti direta
				}

				if (isDoctor) {
					// Remove dados sensíveis do paciente para médicos
					patientData = {
						...patientData,
						address: undefined,
						user: {
							...patientData.user,
							phone: undefined,
							email: undefined,
							cpf: undefined,
						}
					}
				}

				const formattedAppointment = {
					...appointment,
					patient: patientData,
				}

				// Adicionar roomUrl e tokens se a consulta tiver roomName
				let roomData = {}
				if (appointment.roomName) {
					const roomUrl = `https://${process.env.DAILY_DOMAIN || 'medvision.daily.co'}/${appointment.roomName}`
					
					// Gerar tokens apenas para consultas agendadas ou em progresso
					if (appointment.status === 'scheduled' || appointment.status === 'inProgress') {
						try {
							const patientToken = await this.dailyService.generateToken(
								appointment.roomName,
								appointment.patientId,
								'patient',
								{
									userName: appointment.patient.user.name,
									expiresIn: 86400,
								}
							)

							const doctorToken = await this.dailyService.generateToken(
								appointment.roomName,
								appointment.doctorId,
								'doctor',
								{
									userName: appointment.doctor.user.name,
									expiresIn: 86400,
								}
							)

							// Gerar token para admin/master
							let adminToken: string | undefined
							if (req.user?.role === 'admin' || req.user?.role === 'master') {
								adminToken = await this.dailyService.generateToken(
									appointment.roomName,
									req.user.id,
									'admin',
									{
										userName: req.user.name || 'Admin',
										expiresIn: 86400,
									}
								)
							}

							roomData = { roomUrl, patientToken, doctorToken, ...(adminToken && { adminToken }) }
						} catch (error) {
							console.error('Error generating tokens for appointment:', appointment.id, error)
							roomData = { roomUrl }
						}
					} else {
						roomData = { roomUrl }
					}
				}

				// Remove dados do médico se quem está buscando é o próprio médico
				if (isDoctor) {
					const { doctor: _doctor, ...appointmentWithoutDoctor } = formattedAppointment
					return { ...appointmentWithoutDoctor, ...roomData }
				}

				return { ...formattedAppointment, ...roomData }
			})
		)

			return res.status(200).send({
				message: 'Appointments retrieved successfully',
				data: appointmentsWithFiles,
				pagination: result.pagination,
				...(isDoctor && doctorProfile?.utiAccess && { utiAccess }),
			})
		} catch (error) {
			console.error('Error listing appointments:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async addPatientFeedback(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = AppointmentIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid appointment ID', details: params.error })
			}

			const data = AddPatientFeedbackSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const appointment = await this.appointmentRepository.findById(params.data.id)

			if (!appointment) {
				return res.status(404).send({ error: 'Appointment not found' })
			}

			// Verificar se a consulta foi concluída
			if (appointment.status !== 'completed') {
				return res.status(400).send({ error: 'Feedback can only be added to completed appointments' })
			}

			// Verificar se já existe feedback do paciente
			if (appointment.feedbackPatient) {
				return res.status(400).send({ error: 'Patient feedback has already been provided' })
			}

			const updatedAppointment = await this.appointmentRepository.update(params.data.id, {
				feedbackPatient: data.data.feedbackPatient,
			})

			// Registra no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logAppointmentPatientFeedback(
					req.user.id,
					params.data.id,
					req.auditContext
				)
			}

			return res.status(200).send({
				message: 'Patient feedback added successfully',
				data: updatedAppointment,
			})
		} catch (error) {
			console.error('Error adding patient feedback:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async addDoctorFeedback(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = AppointmentIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid appointment ID', details: params.error })
			}

			const data = AddDoctorFeedbackSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const appointment = await this.appointmentRepository.findById(params.data.id)

			if (!appointment) {
				return res.status(404).send({ error: 'Appointment not found' })
			}

			// Verificar se a consulta foi concluída
			if (appointment.status !== 'completed') {
				return res.status(400).send({ error: 'Feedback can only be added to completed appointments' })
			}

			// Verificar se já existe feedback do médico
			if (appointment.feedbackDoctor) {
				return res.status(400).send({ error: 'Doctor feedback has already been provided' })
			}

			const updatedAppointment = await this.appointmentRepository.update(params.data.id, {
				feedbackDoctor: data.data.feedbackDoctor,
			})

			// Registra no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logAppointmentDoctorFeedback(
					req.user.id,
					params.data.id,
					req.auditContext
				)
			}

			return res.status(200).send({
				message: 'Doctor feedback added successfully',
				data: updatedAppointment,
			})
		} catch (error) {
			console.error('Error adding doctor feedback:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async cancelExpired(req: FastifyRequest, res: FastifyReply) {
		try {
			// Apenas master e admin podem executar manualmente
			if (req.user?.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to cancel expired appointments' })
			}

			await cronService.runManually()

			// Registra no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logAction(
					req.user.id,
					'CANCEL_EXPIRED_APPOINTMENTS',
					'Appointment',
					'manual-execution',
					null,
					req.auditContext
				)
			}

			return res.status(200).send({
				message: 'Expired appointments cancellation executed successfully',
			})
		} catch (error) {
			console.error('Error canceling expired appointments:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getRoomToken(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!req.user) {
				return res.status(401).send({ error: 'Unauthorized' })
			}

			const params = AppointmentIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid appointment ID', details: params.error })
			}

			const appointment = await this.appointmentRepository.findById(params.data.id)

			if (!appointment) {
				return res.status(404).send({ error: 'Appointment not found' })
			}

			if (!appointment.roomLink) {
				return res.status(404).send({ error: 'No video room associated with this appointment' })
			}

		// Usa o roomName salvo no banco de dados
		if (!appointment.roomName) {
			return res.status(404).send({ error: 'No room name associated with this appointment' })
		}

		// Gera token de acesso
		try {
			// Mapeia 'master' para 'admin' pois Daily.co não reconhece 'master'
			const dailyRole = req.user.role === 'master' ? 'admin' : req.user.role
			
			const token = await this.dailyService.generateToken(
				appointment.roomName,
				req.user.id,
				dailyRole as 'admin' | 'doctor' | 'patient',
				{
					userName: req.user.email || 'Usuário',
					expiresIn: 7200, // 2 horas
				}
			)

			// Monta a resposta com o token nomeado pelo role
			const responseData: any = {
				roomUrl: appointment.roomLink,
				accessUrl: `${appointment.roomLink}?t=${token}`,
			}

			// Adiciona o token com o nome correto baseado no role
			if (req.user.role === 'doctor') {
				responseData.doctorToken = token
			} else if (req.user.role === 'patient') {
				responseData.patientToken = token
			} else if (req.user.role === 'admin' || req.user.role === 'master') {
				responseData.adminToken = token
			} else {
				responseData.token = token // fallback
			}

			return res.status(200).send({
				message: 'Access token generated successfully',
				data: responseData,
			})
		} catch (tokenError) {
			console.error('Error generating Daily.co token:', tokenError)
			return res.status(500).send({ error: 'Failed to generate access token' })
		}
		} catch (error) {
			console.error('Error getting room token:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getAppointmentCompletePDF(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = AppointmentIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({
					error: 'ID inválido',
					message: 'O ID fornecido não é válido',
				})
			}

			const appointment = await this.appointmentRepository.findById(params.data.id)

			if (!appointment) {
				return res.status(404).send({
					error: 'Consulta não encontrada',
					message: 'A consulta especificada não existe no sistema',
				})
			}

			// Verifica permissões
			if (
				req.user.role !== 'master' &&
				req.user.role !== 'admin' &&
				!(req.user.role === 'doctor' && appointment.doctorId === req.user.doctorId) &&
				!(req.user.role === 'patient' && appointment.patientId === req.user.patientId)
			) {
				return res.status(403).send({
					error: 'Permissão negada',
					message: 'Você não possui permissão para acessar este relatório',
				})
			}

			// Gera o PDF combinado
			const { pdfGeneratorService } = await import('@/services/pdf-generator.service')
			const pdfBase64 = await pdfGeneratorService.generateAppointmentCompletePDF(appointment)

			// Log de auditoria
		await auditService.log({
			userId: req.user.userId,
			action: 'GENERATE_APPOINTMENT_COMPLETE_PDF',
			description: `Gerou PDF completo da consulta ${appointment.id}`,
			impactLevel: ImpactLevel.LOW,
			content: {
				appointmentId: appointment.id,
				patientId: appointment.patientId,
				doctorId: appointment.doctorId,
				date: appointment.appointmentDate,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			// Gera nome do arquivo com padrão: consulta_NomePaciente_DataConsulta.pdf
			const patientName = appointment.patient.user.name
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '') // Remove acentos
				.replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
				.replace(/\s+/g, '_') // Substitui espaços por underscore
				.substring(0, 50) // Limita tamanho
			
			const appointmentDate = new Date(appointment.appointmentDate)
				.toLocaleDateString('pt-BR')
				.replace(/\//g, '-') // Substitui / por -
			
			const filename = `consulta_${patientName}_${appointmentDate}.pdf`

			// Retorna o PDF em base64
			return res.status(200).send({
				message: 'PDF gerado com sucesso',
				data: {
					pdf: pdfBase64,
					filename: filename,
				},
			})
		} catch (error) {
			console.error('Erro ao gerar PDF completo da consulta:', error)
			return res.status(500).send({
				error: 'Erro interno do servidor',
				message: 'Não foi possível gerar o PDF da consulta',
			})
		}
	}
}
