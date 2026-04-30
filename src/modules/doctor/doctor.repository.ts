import { db } from '@/lib/prisma'
import type { CreateDoctorInput, UpdateDoctorInput } from '@/modules/doctor/doctor.schema'

export class DoctorRepository {
	async findAll(filters?: {
		page?: number
		limit?: number
	}) {
		const page = filters?.page || 1
		const limit = filters?.limit || 10
		const skip = (page - 1) * limit

		const [doctors, total] = await Promise.all([
			db.doctor.findMany({
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
				skip,
				take: limit,
				orderBy: {
					createdAt: 'desc',
				},
			}),
			db.doctor.count(),
		])

		return {
			doctors,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		}
	}

	async findById(id: string) {
		return db.doctor.findUnique({
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
				requests: {
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
									},
								},
							},
						},
						appointment: true,
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				prescriptions: {
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
									},
								},
							},
						},
						appointment: true,
						medicamentos: true,
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
				anamises: {
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

	async create(data: CreateDoctorInput & { password: string }) {
		return db.doctor.create({
			data: {
				crm: data.crm,
				specialty: data.specialty,
				monthlySlots: data.monthlySlots,
				weeklyAvailability: data.weeklyAvailability,
				utiAccess: data.utiAccess,
				user: {
					create: {
						name: data.name,
						cpf: data.cpf,
						phone: data.phone,
						email: data.email,
						password: data.password,
						role: 'doctor',
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

	async update(id: string, data: UpdateDoctorInput) {
		const { crm, specialty, monthlySlots, weeklyAvailability, status, utiAccess, active, ...userData } = data

		return db.doctor.update({
			where: { id },
			data: {
				...(crm && { crm }),
				...(specialty && { specialty }),
				...(monthlySlots !== undefined && { monthlySlots }),
				...(weeklyAvailability !== undefined && { weeklyAvailability }),
				...(status && { status }),
				...(utiAccess !== undefined && { utiAccess }),
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

	async checkCrmExists(crm: string) {
		return db.doctor.findUnique({
			where: { crm },
		})
	}

	async findByUserId(userId: string) {
		return db.doctor.findUnique({
			where: { userId },
		})
	}
}
