import { db } from '@/lib/prisma'
import type { CreateTriagemInput, UpdateTriagemInput } from '@/schemas/triagem.schema'

type CreateTriagemData = CreateTriagemInput & { userId: string }

export class TriagemRepository {
	async findAll() {
		return db.triagem.findMany({
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
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						role: true,
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})
	}

	async findById(id: string) {
		return db.triagem.findUnique({
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
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						role: true,
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
		})
	}

	async findByAppointmentId(appointmentId: string) {
		return db.triagem.findFirst({
			where: { appointmentId },
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
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						role: true,
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
		})
	}

	async findByPatientId(patientId: string) {
		return db.triagem.findMany({
			where: { patientId },
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
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						role: true,
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})
	}

	async create(data: CreateTriagemData) {
		return db.triagem.create({
			data,
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
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						role: true,
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
		})
	}

	async update(id: string, data: UpdateTriagemInput) {
		return db.triagem.update({
			where: { id },
			data,
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
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						role: true,
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
		})
	}

	async delete(id: string) {
		return db.triagem.delete({
			where: { id },
		})
	}
}
