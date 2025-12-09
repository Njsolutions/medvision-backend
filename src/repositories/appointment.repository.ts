import { db } from '@/lib/prisma'
import type { CreateAppointmentInput, UpdateAppointmentInput } from '@/schemas/appointment.schema'

export class AppointmentRepository {
	async findById(id: string) {
		return db.appointment.findUnique({
			where: { id },
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
				doctor: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		})
	}

	async create(data: CreateAppointmentInput & { roomName: string }) {
		return db.appointment.create({
			data: {
				patientId: data.patientId,
				doctorId: data.doctorId,
				appointmentDate: new Date(data.appointmentDate),
				reason: data.reason,
				durationMinutes: data.durationMinutes,
				notes: data.notes,
				roomName: data.roomName,
				status: 'scheduled',
			},
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
				doctor: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		})
	}

	async update(id: string, data: UpdateAppointmentInput & { roomName?: string }) {
		const updateData: {
			appointmentDate?: Date
			reason?: string
			status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled' | 'noShow'
			durationMinutes?: number
			notes?: string
			feedbackPatient?: string
			feedbackDoctor?: string
			roomName?: string
			finishedAt?: Date
		} = {}
		
		if (data.appointmentDate) {
			updateData.appointmentDate = new Date(data.appointmentDate)
		}
		if (data.reason) updateData.reason = data.reason
		if (data.status) updateData.status = data.status
		if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes
		if (data.notes !== undefined) updateData.notes = data.notes
		if (data.feedbackPatient !== undefined) updateData.feedbackPatient = data.feedbackPatient
		if (data.feedbackDoctor !== undefined) updateData.feedbackDoctor = data.feedbackDoctor
		if (data.roomName) updateData.roomName = data.roomName

		if (data.status === 'completed' && !updateData.finishedAt) {
			updateData.finishedAt = new Date()
		}

		return db.appointment.update({
			where: { id },
			data: updateData,
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
				doctor: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		})
	}

	async checkPatientExists(patientId: string) {
		return db.patient.findUnique({
			where: { id: patientId },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		})
	}

	async checkDoctorExists(doctorId: string) {
		return db.doctor.findUnique({
			where: { id: doctorId },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		})
	}

	async checkConflict(patientId: string, doctorId: string, appointmentDate: Date) {
		return db.appointment.findUnique({
			where: {
				patientId_doctorId_appointmentDate: {
					patientId,
					doctorId,
					appointmentDate,
				},
			},
		})
	}
}
