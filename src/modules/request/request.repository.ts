import { db } from '@/lib/prisma'
import type { CreateRequestsInput, UpdateRequestInput } from '@/modules/request/request.schema'
import type { RequestStatus, Prisma } from '@prisma/client'

export class RequestRepository {
	/**
	 * Cria múltiplas solicitações de uma vez
	 */
	async createMany(data: CreateRequestsInput) {
		const { patientId, doctorId, appointmentId, solicitacoes } = data

		// Cria múltiplas solicitações em uma transação
		const requests = await db.$transaction(
			solicitacoes.map((solicitacao) =>
				db.request.create({
					data: {
						patientId,
						doctorId,
						appointmentId: appointmentId || null,
						type: solicitacao.tipo,
						status: 'pending',
						details: {
							tipo: solicitacao.tipo,
							descricao: solicitacao.descricao,
							observacoes: solicitacao.observacoes,
						},
					},
					include: {
						patient: {
							include: {
								user: {
									select: {
										id: true,
										name: true,
										cpf: true,
										email: true,
										phone: true,
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
										phone: true,
									},
								},
							},
						},
					},
				})
			)
		)

		return requests
	}

	/**
	 * Busca uma solicitação por ID
	 */
	async findById(id: string) {
		return db.request.findUnique({
			where: { id },
			select: {
				id: true,
				patientId: true,
				doctorId: true,
				appointmentId: true,
				type: true,
				status: true,
				details: true,
				createdAt: true,
				updatedAt: true,
				patient: {
					select: {
						id: true,
						age: true,
						gender: true,
						birthDate: true,
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
				doctor: {
					select: {
						id: true,
						crm: true,
						specialty: true,
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true,
							},
						},
					},
				},
			},
		})
	}

	/**
	 * Lista solicitações com filtros
	 */
	async findMany(filters: {
		status?: RequestStatus
		patientId?: string
		doctorId?: string
		type?: string
		page: number
		limit: number
	}) {
		const { status, patientId, doctorId, type, page, limit } = filters
		const skip = (page - 1) * limit

		const where: Prisma.RequestWhereInput = {}
		if (status) where.status = status
		if (patientId) where.patientId = patientId
		if (doctorId) where.doctorId = doctorId
		if (type) where.type = type as Prisma.RequestWhereInput['type']

		const [requests, total] = await Promise.all([
			db.request.findMany({
				where,
				include: {
					patient: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									cpf: true,
									email: true,
									phone: true,
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
									phone: true,
								},
							},
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take: limit,
			}),
			db.request.count({ where }),
		])

		return {
			requests,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	/**
	 * Atualiza uma solicitação
	 */
	async update(id: string, data: UpdateRequestInput) {
		const updateData: Prisma.RequestUpdateInput = {}
		if (data.status) updateData.status = data.status
		if (data.details) updateData.details = data.details as Prisma.InputJsonValue

		return db.request.update({
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
								email: true,
								phone: true,
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
								phone: true,
							},
						},
					},
				},
			},
		})
	}

	/**
	 * Deleta uma solicitação
	 */
	async delete(id: string) {
		return db.request.delete({
			where: { id },
		})
	}

	/**
	 * Busca solicitações de um paciente específico
	 */
	async findByPatientId(patientId: string) {
		return db.request.findMany({
			where: { patientId },
			include: {
				doctor: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true,
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})
	}

	/**
	 * Busca solicitações de um médico específico
	 */
	async findByDoctorId(doctorId: string) {
		return db.request.findMany({
			where: { doctorId },
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})
	}
}
