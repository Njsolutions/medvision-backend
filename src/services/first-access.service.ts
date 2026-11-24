import { logger } from '@/lib/logger'
import { UserRepository } from '@/modules/auth/user.repository'
import { emailService } from '@/services/email.service'
import { generateOpaqueToken, hashToken } from '@/services/session.logic'

export const FIRST_ACCESS_TTL_MS = 72 * 60 * 60 * 1000

type FirstAccessUser = {
	id: string
	name: string
	email: string
}

export type FirstAccessRole = 'admin' | 'doctor'

const userRepository = new UserRepository()

export function buildSetPasswordUrl(token: string): string {
	const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '')
	return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
}

/**
 * Primeiro acesso sem senha em texto puro: grava o hash de um token de uso único
 * (mesmo mecanismo da redefinição de senha) e envia o link de definição de senha por e-mail.
 * Nunca lança: o cadastro não pode falhar porque o e-mail falhou. O retorno diz se o e-mail saiu.
 */
export async function sendFirstAccess(user: FirstAccessUser, role: FirstAccessRole): Promise<boolean> {
	try {
		const token = generateOpaqueToken()

		await userRepository.setResetToken(user.id, hashToken(token), new Date(Date.now() + FIRST_ACCESS_TTL_MS))

		const data = {
			name: user.name,
			email: user.email,
			loginUrl: process.env.FRONTEND_URL,
			setPasswordUrl: buildSetPasswordUrl(token),
			expiresIn: '72 horas',
		}

		// `sendEmail` lança se o envio falhar.
		if (role === 'doctor') {
			await emailService.sendWelcomeDoctor(user.email, data)
		} else {
			await emailService.sendWelcomeAdmin(user.email, data)
		}

		return true
	} catch (error) {
		logger.error({ err: error }, 'Error sending first access email')
		return false
	}
}
