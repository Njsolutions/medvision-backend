import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuditContext } from '../types/audit.types'

/**
 * Plugin para adicionar contexto de auditoria às requisições
 */
export function getAuditContext(request: FastifyRequest): AuditContext {
  return {
    userId: request.user?.id,
    ipAddress: request.ip || request.headers['x-forwarded-for']?.toString() || request.socket.remoteAddress,
    userAgent: request.headers['user-agent'],
  }
}

/**
 * Decorator para adicionar o contexto de auditoria ao request
 */
export async function auditContextDecorator(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  request.auditContext = getAuditContext(request)
}
