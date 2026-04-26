import { UserRepository } from '@/modules/auth/user.repository'
import {
	PatientSimpleSignInSchema,
	RegisterUserSchema,
	RequestPasswordResetSchema,
	ResetPasswordSchema,
	SignInSchema,
	ValidateResetCodeSchema,
} from '@/modules/auth/auth.schema'
import { CryptoService } from '@/services/crypto.service'
import { JwtService } from '@/services/jwt.service'
import { auditService } from '@/services/audit.service'
import { emailService } from '@/services/email.service'
import { rateLimitService } from '@/services/ratelimit.service'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export class AuthController {
	private userRepository: UserRepository
	private jwtService: JwtService
	private cryptoService: CryptoService

	constructor(fastify: FastifyInstance) {
		this.userRepository = new UserRepository()
		this.jwtService = new JwtService(fastify)
		this.cryptoService = new CryptoService()
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

			const existingUser = await this.userRepository.findByCPF(data.data.cpf)

			if (existingUser) {
				return res.status(409).send({ error: 'Usuário com este CPF já existe' })
			}

			const passwordGeneration = this.cryptoService.generateRandomCode(8)
			const passwordHash = this.cryptoService.hashPassword(passwordGeneration)

			const newUser = await this.userRepository.createUser({
				...data.data,
				password: await passwordHash,
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

			const { password: _, resetCode: __, ...safeUser } = newUser

			return res.status(201).send({
				message: 'Usuário criado com sucesso',
				data: {
					user: safeUser,
				},
			})
		} catch (error) {
			console.error('Error during user registration:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async signIn(req: FastifyRequest, res: FastifyReply) {
		try {
			const loginIdentifier = `${req.ip}:${(req.body as { email?: string } | undefined)?.email ?? 'unknown'}`
			if (rateLimitService.checkLoginLimit(loginIdentifier)) {
				return res.status(429).send({ error: 'Muitas tentativas de login. Tente novamente mais tarde.' })
			}

			const data = SignInSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			const existingUser = await this.userRepository.findByEmail(data.data.email)

			if (!existingUser) {
				return res.status(401).send({ error: 'Email ou senha inválidos' })
			}

			const isPasswordValid = this.cryptoService.comparePassword(data.data.password, existingUser.password)

			if (!(await isPasswordValid)) {
				return res.status(401).send({ error: 'Email ou senha inválidos' })
			}

			const { token, refreshToken, expiresIn } = this.jwtService.generateToken(
				existingUser.id,
				existingUser.role,
				existingUser.name,
			)

			// Registra o login no log de auditoria
			if (req.auditContext) {
				await auditService.logLogin(existingUser.id, req.auditContext)
			}

			return res.status(200).send({
				message: 'Login realizado com sucesso',
				data: {
					token,
					refreshToken,
					expiresIn,
				},
			})
		} catch (error) {
			console.error('Error during user sign-in:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async patientSimpleSignIn(req: FastifyRequest, res: FastifyReply) {
		try {
			const loginIdentifier = `${req.ip}:${(req.body as { cpf?: string } | undefined)?.cpf ?? 'unknown'}`
			if (rateLimitService.checkLoginLimit(loginIdentifier)) {
				return res.status(429).send({ error: 'Muitas tentativas de login. Tente novamente mais tarde.' })
			}

			const data = PatientSimpleSignInSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			const existingUser = await this.userRepository.findPatientByCPF(data.data.cpf)

			if (!existingUser || existingUser.role !== 'patient' || !existingUser.patient || !existingUser.patient.birthDate) {
				return res.status(401).send({ error: 'CPF ou data de nascimento inválidos' })
			}

			const patientBirthDate = existingUser.patient.birthDate.toISOString().slice(0, 10)
			if (patientBirthDate !== data.data.birthDate) {
				return res.status(401).send({ error: 'CPF ou data de nascimento inválidos' })
			}

			const { token, refreshToken, expiresIn } = this.jwtService.generateToken(
				existingUser.id,
				existingUser.role,
				existingUser.name,
				{
					userId: existingUser.id,
					patientId: existingUser.patient.id,
					email: existingUser.email,
				},
			)

			if (req.auditContext) {
				await auditService.logLogin(existingUser.id, req.auditContext)
			}

			return res.status(200).send({
				message: 'Login do paciente realizado com sucesso',
				data: {
					token,
					refreshToken,
					expiresIn,
					patientId: existingUser.patient.id,
				},
			})
		} catch (error) {
			console.error('Error during patient simple sign-in:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async requestPasswordReset(req: FastifyRequest, res: FastifyReply) {
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

			if (!existingUser) {
				return res.status(404).send({ error: 'Usuário com este email não existe' })
			}

		const resetCode = this.cryptoService.generateRandomCode(6)

		await this.userRepository.updateResetCode(existingUser.id, resetCode)

		// Envia o código de recuperação por email
		await emailService.sendPasswordRecoveryCode(existingUser.email, {
			name: existingUser.name,
			recoveryCode: resetCode,
			expiresIn: '15 minutos',
		})

		return res.status(200).send({ message: 'Código de redefinição de senha enviado para o email' })
		} catch (error) {
			console.error('Error during password reset request:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async validateResetCode(req: FastifyRequest, res: FastifyReply) {
		try {
			const data = ValidateResetCodeSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			const existingUser = await this.userRepository.findByEmail(data.data.email)

			if (!existingUser || existingUser.resetCode !== data.data.resetCode) {
				return res.status(400).send({ error: 'Email ou código de redefinição inválidos' })
			}

			// Gera um token temporário válido por 15 minutos
			const resetToken = this.jwtService.generatePasswordResetToken(existingUser.email)

			// Limpa o código de reset do banco de dados por segurança
			await this.userRepository.updateResetCode(existingUser.id, null)

			return res.status(200).send({
				message: 'Código de redefinição válido',
				data: {
					resetToken,
					expiresIn: 900, // 15 minutos em segundos
				},
			})
		} catch (error) {
			console.error('Error during reset code validation:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async resetPassword(req: FastifyRequest, res: FastifyReply) {
		try {
			const data = ResetPasswordSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			// Verifica e decodifica o token de reset
			const tokenData = this.jwtService.verifyPasswordResetToken(data.data.resetToken)

			if (!tokenData) {
				return res.status(400).send({ error: 'Token de redefinição inválido ou expirado' })
			}

			const existingUser = await this.userRepository.findByEmail(tokenData.email)

			if (!existingUser) {
				return res.status(404).send({ error: 'Usuário não encontrado' })
			}

			const newPasswordHash = await this.cryptoService.hashPassword(data.data.newPassword)

			await this.userRepository.updatePassword(existingUser.id, newPasswordHash)

			// Registra a alteração de senha no log de auditoria
			if (req.auditContext) {
				await auditService.logPasswordReset(existingUser.id, req.auditContext)
			}

			return res.status(200).send({ message: 'Senha redefinida com sucesso' })
		} catch (error) {
			console.error('Error during password reset:', error)
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

			const { password: _, ...userWithoutPassword } = user

			return res.status(200).send({
				message: 'Perfil do usuário recuperado com sucesso',
				data: {
					user: userWithoutPassword,
				},
			})
		} catch (error) {
			console.error('Error retrieving user profile:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}
}
