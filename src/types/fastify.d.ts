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
	utiAccess?: boolean
}

declare module 'fastify' {
	interface FastifyRequest {
		// Preenchido pelo `authenticate`. Nas rotas sem esse preHandler o valor não existe em tempo de execução.
		user: AuthUser
		sessionId?: string
		auditContext?: AuditContext
	}

	interface FastifyInstance {
		authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
	}
}

