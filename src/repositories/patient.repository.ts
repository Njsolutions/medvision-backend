import { db } from '@/lib/prisma'
import type { CreatePatientInput, UpdatePatientInput } from '@/schemas/patient.schema'

export class PatientRepository {
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
			},
		})
	}

	async create(data: CreatePatientInput & { password: string }) {
		return db.patient.create({
			data: {
				age: data.age,
				gender: data.gender === 'other' ? 'male' : data.gender,
				address: data.address,
				user: {
					create: {
						name: data.name,
						cpf: data.cpf,
						phone: data.phone,
						email: data.email,
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
		const { age, gender, address, active, ...userData } = data

		return db.patient.update({
			where: { id },
			data: {
				...(age !== undefined && { age }),
				...(gender && gender !== 'other' && { gender }),
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
