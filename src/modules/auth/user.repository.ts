import { db } from '@/lib/prisma'
import type { RegisterUserInput } from '@/modules/auth/auth.schema'

export class UserRepository {
	async findByEmail(email: string) {
		return db.user.findUnique({
			where: { email },
			include: {
				doctor: true,
				patient: true,
				admin: true,
				master: true,
			},
		})
	}

	async findById(id: string) {
		return db.user.findUnique({
			where: { id },
			include: {
				doctor: true,
				patient: true,
				admin: true,
				master: true,
			},
		})
	}

	async findByCPF(cpf: string) {
		return db.user.findUnique({
			where: { cpf },
		})
	}

	async findPatientByCPF(cpf: string) {
		return db.user.findUnique({
			where: { cpf },
			include: {
				patient: true,
			},
		})
	}

	async createUser(userData: RegisterUserInput) {
		return db.user.create({
			data: {
				...userData,
				password: userData.password || '',
			},
		})
	}

	async updateResetCode(id: string, resetCode: string | null) {
		return db.user.update({
			where: { id },
			data: { resetCode },
		})
	}

	async updatePassword(id: string, newPasswordHash: string) {
		return db.user.update({
			where: { id },
			data: {
				password: newPasswordHash,
				resetCode: null,
			},
		})
	}
}
