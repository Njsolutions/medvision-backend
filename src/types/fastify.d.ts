import '@fastify/jwt'
import type { AuditContext } from './audit.types'
import type { UserRole } from './auth.types'

export interface AuthUser {
	id: string
	sub?: string
	userId: string
	email: string
	role: UserRole
	name: string
	doctorId?: string
	patientId?: string
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
