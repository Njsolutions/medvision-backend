import { db } from '@/lib/prisma'
import type { RegisterUserInput } from '@/schemas/auth.schema'

export class UserRepository {
	async findByEmail(email: string) {
		return db.user.findUnique({
			where: { email },
		})
	}

	async findById(id: string) {
		return db.user.findUnique({
			where: { id },
		})
	}

	async findByCPF(cpf: string) {
		return db.user.findUnique({
			where: { cpf },
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

	async updateResetCode(id: string, resetCode: string) {
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
