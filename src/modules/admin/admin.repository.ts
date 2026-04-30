import { db } from '@/lib/prisma'
import type { CreateAdminInput, UpdateAdminInput } from '@/modules/admin/admin.schema'

export class AdminRepository {
	async findById(id: string) {
		return db.admin.findUnique({
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
			},
		})
	}

	async create(data: CreateAdminInput & { password: string }) {
		return db.admin.create({
			data: {
				utiAccess: data.utiAccess,
				user: {
					create: {
						name: data.name,
						cpf: data.cpf,
						phone: data.phone,
						email: data.email,
						password: data.password,
						role: 'admin',
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

	async update(id: string, data: UpdateAdminInput) {
		const { utiAccess, active, ...userData } = data

		return db.admin.update({
			where: { id },
			data: {
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

	async findAll(filters?: {
		page?: number
		limit?: number
	}) {
		const page = filters?.page || 1
		const limit = filters?.limit || 10
		const skip = (page - 1) * limit

		const [admins, total] = await Promise.all([
			db.admin.findMany({
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
					user: {
						name: 'asc',
					},
				},
			}),
			db.admin.count(),
		])

		return {
			admins,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		}
	}

	async delete(id: string) {
		return db.admin.delete({
			where: { id },
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
