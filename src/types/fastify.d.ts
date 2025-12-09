import '@fastify/jwt'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuditContext } from './audit.types'

export interface AuthUser {
	id: string
	email: string
	role: 'ADMIN' | 'DOCTOR' | 'PATIENT'
}

declare module 'fastify' {
	interface FastifyRequest {
		user?: AuthUser
		auditContext?: AuditContext
	}

	interface FastifyInstance {
		authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
	}
}

declare module '@fastify/jwt' {
	interface FastifyJWT {
		user: AuthUser
	}
}
