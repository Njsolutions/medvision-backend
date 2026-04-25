import type { FastifyRequest, FastifyReply } from 'fastify'
import { auditService } from '@/services/audit.service'
import type { GetAuditLogsInput } from './auditlog.schema'

export class AuditLogController {
  /**
   * Lista logs de auditoria com filtros
   */
  async getLogs(
    request: FastifyRequest<{
      Querystring: GetAuditLogsInput
    }>,
    reply: FastifyReply
  ) {
    const filters = request.query

    const [logs, total] = await Promise.all([
      auditService.getLogs({
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      }),
      auditService.countLogs({
        userId: filters.userId,
        action: filters.action,
        impactLevel: filters.impactLevel,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      }),
    ])

    return reply.status(200).send({
      data: logs,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < total,
      },
    })
  }

  /**
   * Obtém estatísticas de logs por nível de impacto
   */
  async getStatistics(_request: FastifyRequest, reply: FastifyReply) {
    const [low, medium, high, critical] = await Promise.all([
      auditService.countLogs({ impactLevel: 'low' }),
      auditService.countLogs({ impactLevel: 'medium' }),
      auditService.countLogs({ impactLevel: 'high' }),
      auditService.countLogs({ impactLevel: 'critical' }),
    ])

    return reply.status(200).send({
      statistics: {
        low,
        medium,
        high,
        critical,
        total: low + medium + high + critical,
      },
    })
  }

  /**
   * Obtém logs de um usuário específico
   */
  async getUserLogs(
    request: FastifyRequest<{
      Params: { userId: string }
      Querystring: { limit?: number; offset?: number }
    }>,
    reply: FastifyReply
  ) {
    const { userId } = request.params
    const { limit = 50, offset = 0 } = request.query

    const [logs, total] = await Promise.all([
      auditService.getLogs({ userId, limit, offset }),
      auditService.countLogs({ userId }),
    ])

    return reply.status(200).send({
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  }

  /**
   * Obtém logs por tipo de ação
   */
  async getActionLogs(
    request: FastifyRequest<{
      Params: { action: string }
      Querystring: { limit?: number; offset?: number }
    }>,
    reply: FastifyReply
  ) {
    const { action } = request.params
    const { limit = 50, offset = 0 } = request.query

    const [logs, total] = await Promise.all([
      auditService.getLogs({ action, limit, offset }),
      auditService.countLogs({ action }),
    ])

    return reply.status(200).send({
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  }
}

export const auditLogController = new AuditLogController()
