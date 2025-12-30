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
						files: {
							where: {
								deletedAt: null,
							},
							include: {
								uploadedByUser: {
									select: {
										id: true,
										name: true,
										email: true,
										role: true,
									},
								},
							},
							orderBy: {
								createdAt: 'desc',
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
				triagens: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								role: true,
							},
						},
					},
				},
				prescriptions: {
					include: {
						medicamentos: true,
						doctor: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
									},
								},
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				requests: {
					include: {
						patient: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
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
										email: true,
									},
								},
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				anamneses: {
					include: {
						doctor: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
									},
								},
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
			},
		})
	}

	async create(data: CreateAppointmentInput & { roomName: string; roomLink?: string }) {
		return db.appointment.create({
			data: {
				patientId: data.patientId,
				doctorId: data.doctorId,
				appointmentDate: new Date(data.appointmentDate),
				reason: data.reason,
				durationMinutes: data.durationMinutes,
				notes: data.notes,
				roomName: data.roomName,
				roomLink: data.roomLink,
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
						files: {
							where: {
								deletedAt: null,
							},
							include: {
								uploadedByUser: {
									select: {
										id: true,
										name: true,
										email: true,
										role: true,
									},
								},
							},
							orderBy: {
								createdAt: 'desc',
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
				triagens: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								role: true,
							},
						},
					},
				},
				requests: {
					include: {
						patient: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
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
										email: true,
									},
								},
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				anamneses: {
					include: {
						doctor: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
									},
								},
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
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
				triagens: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								role: true,
							},
						},
					},
				},
				requests: {
					include: {
						patient: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
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
										email: true,
									},
								},
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				anamneses: {
					include: {
						doctor: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										email: true,
									},
								},
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
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

	async checkConflict(
		patientId: string, 
		doctorId: string, 
		appointmentDate: Date, 
		durationMinutes: number = 60,
		excludeAppointmentId?: string
	) {
		// Calcular o fim da consulta
		const appointmentEnd = new Date(appointmentDate.getTime() + durationMinutes * 60 * 1000)
		
		// Buscar consultas que possam ter conflito de horário
		const conflicts = await db.appointment.findMany({
			where: {
				OR: [
					{ doctorId }, // Conflito de médico
					{ patientId }, // Conflito de paciente
				],
				status: {
					notIn: ['cancelled', 'noShow', 'completed'], // Ignorar consultas finalizadas
				},
				// Excluir a própria consulta se estiver atualizando
				...(excludeAppointmentId && {
					id: { not: excludeAppointmentId },
				}),
			},
			select: {
				id: true,
				appointmentDate: true,
				durationMinutes: true,
				doctorId: true,
				patientId: true,
			},
		})

		// Verificar sobreposição de horários
		for (const existing of conflicts) {
			const existingEnd = new Date(
				existing.appointmentDate.getTime() + (existing.durationMinutes || 60) * 60 * 1000
			)

			// Verifica se há sobreposição:
			// 1. Nova consulta começa antes do fim da existente E
			// 2. Nova consulta termina depois do início da existente
			const hasOverlap = 
				appointmentDate < existingEnd && 
				appointmentEnd > existing.appointmentDate

			if (hasOverlap) {
				return existing // Retorna a consulta conflitante
			}
		}

		return null // Sem conflitos
	}

	async findAll(filters?: {
		status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled' | 'noShow'
		patientId?: string
		doctorId?: string
		startDate?: Date
		endDate?: Date
		page?: number
		limit?: number
	}) {
		const page = filters?.page || 1
		const limit = filters?.limit || 10
		const skip = (page - 1) * limit

		const where: {
			status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled' | 'noShow'
			patientId?: string
			doctorId?: string
			appointmentDate?: {
				gte?: Date
				lte?: Date
			}
		} = {}

		if (filters?.status) {
			where.status = filters.status
		}

		if (filters?.patientId) {
			where.patientId = filters.patientId
		}

		if (filters?.doctorId) {
			where.doctorId = filters.doctorId
		}

		if (filters?.startDate || filters?.endDate) {
			where.appointmentDate = {}
			if (filters.startDate) {
				where.appointmentDate.gte = filters.startDate
			}
			if (filters.endDate) {
				where.appointmentDate.lte = filters.endDate
			}
		}

		const [appointments, total] = await Promise.all([
			db.appointment.findMany({
				where,
				skip,
				take: limit,
				orderBy: {
					appointmentDate: 'desc',
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
							files: {
								where: {
									deletedAt: null,
								},
								include: {
									uploadedByUser: {
										select: {
											id: true,
											name: true,
											email: true,
										},
									},
								},
								orderBy: {
									createdAt: 'desc',
								},
							},
							uti: true,
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
					triagens: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									role: true,
								},
							},
						},
					},
					prescriptions: {
						include: {
							medicamentos: true,
							doctor: {
								include: {
									user: {
										select: {
											id: true,
											name: true,
											email: true,
										},
									},
								},
							},
						},
						orderBy: {
							createdAt: 'desc',
						},
					},
					requests: {
						include: {
							patient: {
								include: {
									user: {
										select: {
											id: true,
											name: true,
											email: true,
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
											email: true,
										},
									},
								},
							},
						},
						orderBy: {
							createdAt: 'desc',
						},
					},
					anamneses: {
						include: {
							doctor: {
								include: {
									user: {
										select: {
											id: true,
											name: true,
											email: true,
										},
									},
								},
							},
						},
						orderBy: {
							createdAt: 'desc',
						},
					},
				},
			}),
			db.appointment.count({ where }),
		])

		return {
			appointments,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		}
	}
}
