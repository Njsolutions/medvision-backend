import { UserRepository } from '@/modules/auth/user.repository'
import {
	PatientSimpleSignInSchema,
	RegisterUserSchema,
	RequestPasswordResetSchema,
	ResetPasswordSchema,
	SignInSchema,
	ValidateResetCodeSchema,
} from '@/modules/auth/auth.schema'
import { extractAccessToken } from '@/plugins/auth.plugin'
import { CryptoService } from '@/services/crypto.service'
import { auditService } from '@/services/audit.service'
import { emailService } from '@/services/email.service'
import { sendFirstAccess } from '@/services/first-access.service'
import { rateLimitService } from '@/services/ratelimit.service'
import {
	RESET_CODE_MAX_ATTEMPTS,
	RESET_CODE_TTL_MS,
	RESET_TOKEN_TTL_MS,
	generateOpaqueToken,
	hashResetCode,
	hashToken,
	safeEqualHex,
} from '@/services/session.logic'
import { sessionService, type IssuedSession } from '@/services/session.service'
import { parseAllowedOrigins, passesCsrfCheck } from '@/utils/security/origin'
import { canCreateRole } from '@/utils/security/role-policy'
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from '@/utils/session-cookies'
import type { FastifyReply, FastifyRequest } from 'fastify'

const ACCESS_EXPIRES_IN_SECONDS = 8 * 60 * 60
const RESET_WINDOW = { windowMs: 15 * 60 * 1000, maxRequests: 10 }
const REFRESH_LIMIT = { windowMs: 60 * 1000, maxRequests: 30 }

type SessionUser = {
	id: string
	name: string
	email: string
	role: string
	doctorId?: string
	patientId?: string
}

export class AuthController {
	private userRepository: UserRepository
	private cryptoService: CryptoService

	constructor() {
		this.userRepository = new UserRepository()
		this.cryptoService = new CryptoService()
	}

	// Segredo do servidor usado no HMAC do código de recuperação.
	private get serverSecret() {
		const secret = process.env.COOKIE_SECRET

		if (!secret) {
			throw new Error('COOKIE_SECRET must be configured')
		}

		return secret
	}

	// Login, refresh e logout não passam pelo `authenticate`, então checam a origem aqui.
	private isOriginAllowed(req: FastifyRequest, usesCookie: boolean) {
		return passesCsrfCheck({
			method: req.method,
			origin: req.headers.origin,
			usesCookie,
			allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGINS),
		})
	}

	private sendLocked(res: FastifyReply, remainingMs: number) {
		const retryAfterSeconds = Math.ceil(remainingMs / 1000)

		return res
			.status(429)
			.header('Retry-After', String(retryAfterSeconds))
			.send({ error: 'Muitas tentativas. Tente novamente mais tarde.', retryAfterSeconds })
	}

	private async startSession(req: FastifyRequest, res: FastifyReply, userId: string) {
		const session: IssuedSession = await sessionService.create(userId, {
			ip: req.ip,
			userAgent: req.headers['user-agent'],
		})

		setSessionCookies(res, session)

		return session
	}

	async register(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user?.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Permissões insuficientes para registrar um novo usuário' })
			}

			const data = RegisterUserSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			if (!canCreateRole(req.user?.role, data.data.role)) {
				return res.status(403).send({ error: 'Permissões insuficientes para criar um usuário com este papel' })
			}

			const existingUser = await this.userRepository.findByCPF(data.data.cpf)

			if (existingUser) {
				return res.status(409).send({ error: 'Usuário com este CPF já existe' })
			}

			// Ninguém conhece esta senha: o usuário define a própria pelo link de primeiro acesso.
			const newUser = await this.userRepository.createUser({
				...data.data,
				password: await this.cryptoService.hashUnusablePassword(),
			})

			// Registra a criação do usuário no log de auditoria
			if (req.user?.id && req.auditContext && data.data.role) {
				await auditService.logUserCreate(
					req.user.id,
					newUser.id,
					data.data.role,
					req.auditContext
				)
			}

			// Paciente entra por CPF + data de nascimento e não recebe link de senha.
			const firstAccessEmailSent =
				newUser.role === 'admin' || newUser.role === 'doctor'
					? await sendFirstAccess(newUser, newUser.role)
					: false

			return res.status(201).send({
				message: 'Usuário criado com sucesso',
				data: {
					user: this.stripSecrets(newUser),
					firstAccessEmailSent,
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error during user registration')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async signIn(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!this.isOriginAllowed(req, false)) {
				return res.status(403).send({ error: 'Origem não permitida' })
			}

			const loginIdentifier = `${req.ip}:${(req.body as { email?: string } | undefined)?.email ?? 'unknown'}`
			if (rateLimitService.checkLoginLimit(loginIdentifier)) {
				return res.status(429).send({ error: 'Muitas tentativas de login. Tente novamente mais tarde.' })
			}

			const data = SignInSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			const lockoutKey = `signin:${data.data.email.toLowerCase()}`
			const lockedMs = rateLimitService.lockoutRemainingMs(lockoutKey)

			if (lockedMs > 0) {
				return this.sendLocked(res, lockedMs)
			}

			const existingUser = await this.userRepository.findByEmail(data.data.email)

			if (!existingUser) {
				rateLimitService.registerFailure(lockoutKey)
				return res.status(401).send({ error: 'Email ou senha inválidos' })
			}

			if (!existingUser.active) {
				return res.status(403).send({ error: 'Usuário inativo' })
			}

			const isPasswordValid = this.cryptoService.comparePassword(data.data.password, existingUser.password)

			if (!(await isPasswordValid)) {
				rateLimitService.registerFailure(lockoutKey)
				return res.status(401).send({ error: 'Email ou senha inválidos' })
			}

			rateLimitService.clearFailures(lockoutKey)
			await this.startSession(req, res, existingUser.id)

			// Registra o login no log de auditoria
			if (req.auditContext) {
				await auditService.logLogin(existingUser.id, req.auditContext)
			}

			return res.status(200).send({
				message: 'Login realizado com sucesso',
				data: {
					user: this.toSessionUser({
						...existingUser,
						doctorId: existingUser.doctor?.id,
						patientId: existingUser.patient?.id,
					}),
					expiresIn: ACCESS_EXPIRES_IN_SECONDS,
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error during user sign-in')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async patientSimpleSignIn(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!this.isOriginAllowed(req, false)) {
				return res.status(403).send({ error: 'Origem não permitida' })
			}

			const loginIdentifier = `${req.ip}:${(req.body as { cpf?: string } | undefined)?.cpf ?? 'unknown'}`
			if (rateLimitService.checkLoginLimit(loginIdentifier)) {
				return res.status(429).send({ error: 'Muitas tentativas de login. Tente novamente mais tarde.' })
			}

			const data = PatientSimpleSignInSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			// Bloqueio por CPF, sem o IP: o par CPF + data de nascimento tem pouca entropia.
			// A mesma resposta vale para CPF inexistente, para não revelar quais CPFs estão cadastrados.
			const lockoutKey = `patient-signin:${data.data.cpf}`
			const lockedMs = rateLimitService.lockoutRemainingMs(lockoutKey)

			if (lockedMs > 0) {
				return this.sendLocked(res, lockedMs)
			}

			const existingUser = await this.userRepository.findPatientByCPF(data.data.cpf)

			if (!existingUser || existingUser.role !== 'patient' || !existingUser.patient || !existingUser.patient.birthDate) {
				rateLimitService.registerFailure(lockoutKey)
				return res.status(401).send({ error: 'CPF ou data de nascimento inválidos' })
			}

			const patientBirthDate = existingUser.patient.birthDate.toISOString().slice(0, 10)
			if (patientBirthDate !== data.data.birthDate) {
				rateLimitService.registerFailure(lockoutKey)
				return res.status(401).send({ error: 'CPF ou data de nascimento inválidos' })
			}

			if (!existingUser.active) {
				return res.status(403).send({ error: 'Usuário inativo' })
			}

			rateLimitService.clearFailures(lockoutKey)
			await this.startSession(req, res, existingUser.id)

			if (req.auditContext) {
				await auditService.logLogin(existingUser.id, req.auditContext)
			}

			return res.status(200).send({
				message: 'Login do paciente realizado com sucesso',
				data: {
					user: this.toSessionUser({ ...existingUser, patientId: existingUser.patient.id }),
					expiresIn: ACCESS_EXPIRES_IN_SECONDS,
					patientId: existingUser.patient.id,
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error during patient simple sign-in')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	// Troca o par de tokens. O refresh vem só do cookie HttpOnly restrito a /auth.
	async refresh(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!this.isOriginAllowed(req, true)) {
				return res.status(403).send({ error: 'Origem não permitida' })
			}

			if (rateLimitService.isLimited(`refresh:${req.ip}`, REFRESH_LIMIT)) {
				return res.status(429).send({ error: 'Muitas tentativas. Tente novamente em instantes.' })
			}

			const refreshToken = req.cookies?.[REFRESH_COOKIE]

			if (!refreshToken) {
				return res.status(401).send({ error: 'Sessão inválida ou expirada' })
			}

			const result = await sessionService.refresh(refreshToken, {
				ip: req.ip,
				userAgent: req.headers['user-agent'],
			})

			if (!result.ok) {
				// Corrida entre abas: a outra resposta já gravou os cookies novos. Limpar aqui os apagaria.
				if (result.reason === 'grace') {
					return res.status(401).send({ error: 'Renovação em andamento', code: 'refresh_in_progress' })
				}

				clearSessionCookies(res)
				return res.status(401).send({ error: 'Sessão inválida ou expirada' })
			}

			setSessionCookies(res, result.session)

			return res.status(200).send({
				message: 'Sessão renovada com sucesso',
				data: { expiresIn: ACCESS_EXPIRES_IN_SECONDS },
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error during session refresh')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	// Funciona mesmo com o token de acesso expirado: aceita qualquer um dos dois tokens.
	async logout(req: FastifyRequest, res: FastifyReply) {
		try {
			const extracted = extractAccessToken(req)
			const refreshToken = req.cookies?.[REFRESH_COOKIE]
			const usesCookie = Boolean(req.cookies?.[ACCESS_COOKIE] || refreshToken)

			if (!this.isOriginAllowed(req, usesCookie)) {
				return res.status(403).send({ error: 'Origem não permitida' })
			}

			const session = await sessionService.revokeByTokens(
				{ accessToken: extracted?.token, refreshToken },
				'logout',
			)

			if (session && req.auditContext) {
				await auditService.logLogout(session.userId, req.auditContext)
			}

			clearSessionCookies(res)

			return res.status(200).send({ message: 'Sessão encerrada com sucesso' })
		} catch (error) {
			req.log.error({ err: error }, 'Error during logout')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async me(req: FastifyRequest, res: FastifyReply) {
		if (!req.user) {
			return res.status(401).send({ error: 'Não autorizado' })
		}

		return res.status(200).send({
			data: {
				user: this.toSessionUser(req.user),
				expiresIn: ACCESS_EXPIRES_IN_SECONDS,
			},
		})
	}

	// Resposta sempre igual, exista o e-mail ou não: evita enumerar usuários.
	async requestPasswordReset(req: FastifyRequest, res: FastifyReply) {
		const genericResponse = { message: 'Se o e-mail estiver cadastrado, enviaremos um código de redefinição.' }

		try {
			const resetIdentifier = `${req.ip}:${(req.body as { email?: string } | undefined)?.email ?? 'unknown'}`
			if (rateLimitService.checkPasswordResetLimit(resetIdentifier)) {
				return res.status(429).send({ error: 'Muitas tentativas de recuperação de senha. Tente novamente mais tarde.' })
			}

			const data = RequestPasswordResetSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			const existingUser = await this.userRepository.findByEmail(data.data.email)

			if (!existingUser || !existingUser.active) {
				return res.status(200).send(genericResponse)
			}

			const resetCode = this.cryptoService.generateRandomCode(6)

			await this.userRepository.setResetCode(
				existingUser.id,
				hashResetCode(resetCode, this.serverSecret),
				new Date(Date.now() + RESET_CODE_TTL_MS),
			)

			// Sem await: o tempo de resposta não revela se o e-mail existe.
			void emailService
				.sendPasswordRecoveryCode(existingUser.email, {
					name: existingUser.name,
					recoveryCode: resetCode,
					expiresIn: '15 minutos',
				})
				.catch((error) => req.log.error({ err: error }, 'Error sending recovery code'))

			return res.status(200).send(genericResponse)
		} catch (error) {
			req.log.error({ err: error }, 'Error during password reset request')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async validateResetCode(req: FastifyRequest, res: FastifyReply) {
		const invalid = { error: 'Email ou código de redefinição inválidos' }

		try {
			const data = ValidateResetCodeSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			if (rateLimitService.isLimited(`reset-validate:${req.ip}:${data.data.email}`, RESET_WINDOW)) {
				return res.status(429).send({ error: 'Muitas tentativas. Tente novamente mais tarde.' })
			}

			const user = await this.userRepository.findByEmail(data.data.email)

			if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
				return res.status(400).send(invalid)
			}

			if (user.resetCodeExpiresAt.getTime() <= Date.now() || user.resetCodeAttempts >= RESET_CODE_MAX_ATTEMPTS) {
				await this.userRepository.clearResetCode(user.id)
				return res.status(400).send(invalid)
			}

			const submittedHash = hashResetCode(data.data.resetCode, this.serverSecret)

			if (!safeEqualHex(user.resetCodeHash, submittedHash)) {
				const { resetCodeAttempts } = await this.userRepository.incrementResetCodeAttempts(user.id)

				if (resetCodeAttempts >= RESET_CODE_MAX_ATTEMPTS) {
					await this.userRepository.clearResetCode(user.id)
				}

				return res.status(400).send(invalid)
			}

			// Token opaco de uso único; só o hash fica no banco.
			const resetToken = generateOpaqueToken()
			const exchanged = await this.userRepository.exchangeResetCodeForToken(
				user.id,
				user.resetCodeHash,
				hashToken(resetToken),
				new Date(Date.now() + RESET_TOKEN_TTL_MS),
			)

			if (!exchanged) {
				return res.status(400).send(invalid)
			}

			return res.status(200).send({
				message: 'Código de redefinição válido',
				data: {
					resetToken,
					expiresIn: RESET_TOKEN_TTL_MS / 1000,
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error during reset code validation')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async resetPassword(req: FastifyRequest, res: FastifyReply) {
		try {
			if (rateLimitService.isLimited(`reset-password:${req.ip}`, RESET_WINDOW)) {
				return res.status(429).send({ error: 'Muitas tentativas. Tente novamente mais tarde.' })
			}

			const data = ResetPasswordSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			const tokenHash = hashToken(data.data.resetToken)
			const user = await this.userRepository.findByResetToken(tokenHash)

			if (!user || !user.active) {
				return res.status(400).send({ error: 'Token de redefinição inválido ou expirado' })
			}

			const newPasswordHash = await this.cryptoService.hashPassword(data.data.newPassword)
			const consumed = await this.userRepository.consumeResetTokenAndSetPassword(user.id, tokenHash, newPasswordHash)

			if (!consumed) {
				return res.status(400).send({ error: 'Token de redefinição inválido ou expirado' })
			}

			// Quem tinha a senha antiga (ou um token roubado) perde o acesso.
			await sessionService.revokeAllForUser(user.id, 'password_reset')

			// Registra a alteração de senha no log de auditoria
			if (req.auditContext) {
				await auditService.logPasswordReset(user.id, req.auditContext)
			}

			return res.status(200).send({ message: 'Senha redefinida com sucesso' })
		} catch (error) {
			req.log.error({ err: error }, 'Error during password reset')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async userProfile(req: FastifyRequest, res: FastifyReply) {
		try {
			const userId = req.user?.id

			if (!userId) {
				return res.status(401).send({ error: 'Não autorizado' })
			}

			const user = await this.userRepository.findById(userId)

			if (!user) {
				return res.status(404).send({ error: 'Usuário não encontrado' })
			}

			return res.status(200).send({
				message: 'Perfil do usuário recuperado com sucesso',
				data: {
					user: this.stripSecrets(user),
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error retrieving user profile')
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	private toSessionUser(user: {
		id: string
		name: string
		email: string
		role: string
		doctorId?: string
		patientId?: string
	}): SessionUser {
		return {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			...(user.doctorId && { doctorId: user.doctorId }),
			...(user.patientId && { patientId: user.patientId }),
		}
	}

	// Nunca devolver senha, hashes de código/token nem contadores de recuperação.
	private stripSecrets<T extends Record<string, unknown>>(user: T) {
		const {
			password: _password,
			resetCodeHash: _resetCodeHash,
			resetCodeExpiresAt: _resetCodeExpiresAt,
			resetCodeAttempts: _resetCodeAttempts,
			resetTokenHash: _resetTokenHash,
			resetTokenExpiresAt: _resetTokenExpiresAt,
			...safeUser
		} = user

		return safeUser
	}
}
