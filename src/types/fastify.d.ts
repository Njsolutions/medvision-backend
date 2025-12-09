import '@fastify/jwt'
import type { AuthUser } from '../plugins/auth.plugin'
import type { AuditContext } from './audit.types'

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
