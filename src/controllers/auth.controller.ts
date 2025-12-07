import { UserRepository } from '@/repositories/user.repository'
import {
	RegisterUserSchema,
	RequestPasswordResetSchema,
	ResetPasswordSchema,
	SignInSchema,
} from '@/schemas/auth.schema'
import { CryptoService } from '@/services/crypto.service'
import { JwtService } from '@/services/jwt.service'
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
			/* if (req.user !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to register a new user' })
			} */

			const data = RegisterUserSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingUser = await this.userRepository.findByCPF(data.data.cpf)

			if (existingUser) {
				return res.status(409).send({ error: 'User with this CPF already exists' })
			}

			const passwordGeneration = this.cryptoService.generateRandomCode(8)
			const passwordHash = this.cryptoService.hashPassword(passwordGeneration)

			return await this.userRepository.createUser({
				...data.data,
				password: await passwordHash,
			})
		} catch (error) {
			console.error('Error during user registration:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async signIn(req: FastifyRequest, res: FastifyReply) {
		try {
			const data = SignInSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingUser = await this.userRepository.findByEmail(data.data.email)

			if (!existingUser) {
				return res.status(401).send({ error: 'Invalid email or password' })
			}

			const isPasswordValid = this.cryptoService.comparePassword(data.data.password, existingUser.password)

			if (!(await isPasswordValid)) {
				return res.status(401).send({ error: 'Invalid email or password' })
			}

			const { token, refreshToken, expiresIn } = this.jwtService.generateToken(
				existingUser.id,
				existingUser.role,
				existingUser.name,
			)

			return res.status(200).send({
				message: 'Sign-in successful',
				data: {
					token,
					refreshToken,
					expiresIn,
				},
			})
		} catch (error) {
			console.error('Error during user sign-in:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async requestPasswordReset(req: FastifyRequest, res: FastifyReply) {
		try {
			const data = RequestPasswordResetSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingUser = await this.userRepository.findByEmail(data.data.email)

			if (!existingUser) {
				return res.status(404).send({ error: 'User with this email does not exist' })
			}

			const resetCode = this.cryptoService.generateRandomCode(6)

			await this.userRepository.updateResetCode(existingUser.id, resetCode)

			return res.status(200).send({ message: 'Password reset code sent to email' })
		} catch (error) {
			console.error('Error during password reset request:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async resetPassword(req: FastifyRequest, res: FastifyReply) {
		try {
			const data = ResetPasswordSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingUser = await this.userRepository.findByEmail(data.data.email)

			if (!existingUser) {
				return res.status(400).send({ error: 'Invalid email or reset code' })
			}

			const newPasswordHash = await this.cryptoService.hashPassword(data.data.newPassword)

			await this.userRepository.updatePassword(existingUser.id, newPasswordHash)

			return res.status(200).send({ message: 'Password has been reset successfully' })
		} catch (error) {
			console.error('Error during password reset:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async userProfile(req: FastifyRequest, res: FastifyReply) {
		try {
			const userId = req.user?.id

			if (!userId) {
				return res.status(401).send({ error: 'Unauthorized' })
			}

			const user = await this.userRepository.findById(userId)

			if (!user) {
				return res.status(404).send({ error: 'User not found' })
			}

			const { password: _, ...userWithoutPassword } = user

			return res.status(200).send({
				message: 'User profile retrieved successfully',
				data: {
					user: userWithoutPassword,
				},
			})
		} catch (error) {
			console.error('Error retrieving user profile:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
