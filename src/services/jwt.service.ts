import type { FastifyInstance } from 'fastify'
import type { JWTPayload, UserRole } from '../types/auth.types'

interface TokenData {
	token: string
	refreshToken: string
	expiresIn: number
}

export class JwtService {
	private fastify: FastifyInstance

	constructor(fastify: FastifyInstance) {
		this.fastify = fastify
	}

	generateToken(userId: string, role: UserRole, name: string): TokenData {
		const expiresIn = 24 * 60 * 60 // 24 hours in seconds
		const payload: JWTPayload = {
			id: userId,
			role,
			name,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + expiresIn,
			aud: 'medvision',
			iss: 'medvision-auth',
		} as JWTPayload

		const token = this.fastify.jwt.sign(payload, { expiresIn: `${expiresIn}s` })

		const refreshExpiresIn = expiresIn * 2
		const refreshToken = this.fastify.jwt.sign(payload, { expiresIn: `${refreshExpiresIn}s` })

		return { token, refreshToken, expiresIn }
	}

	verifyToken(token: string): JWTPayload | null {
		try {
			const decoded = this.fastify.jwt.verify(token) as JWTPayload
			return decoded
		} catch {
			return null
		}
	}
}
