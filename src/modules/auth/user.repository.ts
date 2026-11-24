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

	async createUser(userData: RegisterUserInput & { password: string }) {
		return db.user.create({
			data: userData,
		})
	}

	async setResetCode(id: string, codeHash: string, expiresAt: Date) {
		return db.user.update({
			where: { id },
			data: { resetCodeHash: codeHash, resetCodeExpiresAt: expiresAt, resetCodeAttempts: 0 },
		})
	}

	async clearResetCode(id: string) {
		return db.user.update({
			where: { id },
			data: { resetCodeHash: null, resetCodeExpiresAt: null, resetCodeAttempts: 0 },
		})
	}

	async incrementResetCodeAttempts(id: string) {
		return db.user.update({
			where: { id },
			data: { resetCodeAttempts: { increment: 1 } },
			select: { resetCodeAttempts: true },
		})
	}

	// Troca o código pelo token de redefinição (uso único) de forma atômica: só uma requisição vence.
	async exchangeResetCodeForToken(id: string, codeHash: string, tokenHash: string, tokenExpiresAt: Date) {
		const result = await db.user.updateMany({
			where: { id, resetCodeHash: codeHash },
			data: {
				resetCodeHash: null,
				resetCodeExpiresAt: null,
				resetCodeAttempts: 0,
				resetTokenHash: tokenHash,
				resetTokenExpiresAt: tokenExpiresAt,
			},
		})

		return result.count === 1
	}

	async setResetToken(id: string, tokenHash: string, expiresAt: Date) {
		return db.user.update({
			where: { id },
			data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
		})
	}

	async findByResetToken(tokenHash: string) {
		return db.user.findFirst({
			where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
			select: { id: true, active: true },
		})
	}

	// Consome o token e grava a nova senha na mesma operação. Devolve false se outra requisição já o usou.
	async consumeResetTokenAndSetPassword(id: string, tokenHash: string, newPasswordHash: string) {
		const result = await db.user.updateMany({
			where: { id, resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
			data: {
				password: newPasswordHash,
				resetTokenHash: null,
				resetTokenExpiresAt: null,
				resetCodeHash: null,
				resetCodeExpiresAt: null,
				resetCodeAttempts: 0,
			},
		})

		return result.count === 1
	}
}
