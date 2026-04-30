import { db } from '@/lib/prisma'
import type { CreatePatientInput, UpdatePatientInput } from '@/modules/patient/patient.schema'

export class PatientRepository {
	async findAll(filters?: {
		page?: number
		limit?: number
	}) {
		const page = filters?.page || 1
		const limit = filters?.limit || 10
		const skip = (page - 1) * limit

		const [patients, total] = await Promise.all([
			db.patient.findMany({
				include: {
					user: {
						select: {
							id: true,
							name: true,
							cpf: true,
							phone: true,
							email: true,
							active: true,
							role: true,
							createdAt: true,
							updatedAt: true,
						},
					},
					files: {
						where: {
							deletedAt: null,
						},
						orderBy: {
							createdAt: 'desc',
						},
					},
				},
				skip,
				take: limit,
				orderBy: {
					createdAt: 'desc',
				},
			}),
			db.patient.count(),
		])

		return {
			patients,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		}
	}

	async findById(id: string) {
		return db.patient.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						active: true,
						role: true,
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
			},
		})
	}

	async findByIdComplete(id: string) {
		return db.patient.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						active: true,
						role: true,
						createdAt: true,
						updatedAt: true,
					},
				},
				appointments: {
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
						prescriptions: {
							include: {
								medicamentos: true,
							},
						},
					},
					orderBy: {
						appointmentDate: 'desc',
					},
				},
				prescriptions: {
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
						appointment: {
							select: {
								id: true,
								appointmentDate: true,
								reason: true,
							},
						},
						medicamentos: true,
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				requests: {
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
				anamises: {
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
		})
	}

	async create(data: CreatePatientInput & { password: string }) {
		return db.patient.create({
			data: {
				age: data.age,
				...(data.birthDate && { birthDate: new Date(data.birthDate) }),
				...(data.motherName && { motherName: data.motherName }),
				gender: data.gender,
				address: data.address,
				user: {
					create: {
						name: data.name,
						cpf: data.cpf,
						phone: data.phone,
						email: data.email || '',
						password: data.password,
						role: 'patient',
					},
				},
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						active: true,
						role: true,
						createdAt: true,
						updatedAt: true,
					},
				},
			},
		})
	}

	async update(id: string, data: UpdatePatientInput) {
		const { age, birthDate, motherName, gender, address, active, ...userData } = data

		return db.patient.update({
			where: { id },
			data: {
				...(age !== undefined && { age }),
				...(birthDate && { birthDate: new Date(birthDate) }),
				...(motherName !== undefined && { motherName }),
				...(gender && { gender }),
				...(address !== undefined && { address }),
				user: {
					update: {
						...(userData.name && { name: userData.name }),
						...(userData.phone && { phone: userData.phone }),
						...(userData.email && { email: userData.email }),
						...(active !== undefined && { active }),
					},
				},
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						phone: true,
						email: true,
						active: true,
						role: true,
						createdAt: true,
						updatedAt: true,
					},
				},
			},
		})
	}

	async checkCpfExists(cpf: string) {
		return db.user.findUnique({
			where: { cpf },
		})
	}

	async checkEmailExists(email: string) {
		return db.user.findUnique({
			where: { email },
		})
	}
}
