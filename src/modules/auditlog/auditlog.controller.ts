import type { FastifyRequest, FastifyReply } from 'fastify'
import { auditService } from '@/services/audit.service'
import type { GetAuditLogsInput } from './auditlog.schema'

export class AuditLogController {
  /**
   * Lista logs de auditoria com filtros combinados
   */
  async getLogs(
    request: FastifyRequest<{ Querystring: GetAuditLogsInput }>,
    reply: FastifyReply
  ) {
    const { limit, offset, startDate, endDate, ...rest } = request.query
    const filters = {
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    }

    const [logs, total] = await Promise.all([
      auditService.getLogs({ ...filters, limit, offset }),
      auditService.countLogs(filters),
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
   * Obtém estatísticas de logs por nível de impacto
   */
  async getStatistics(_request: FastifyRequest, reply: FastifyReply) {
    const counts = await auditService.countByImpactLevel()

    return reply.status(200).send({
      statistics: {
        ...counts,
        total: counts.low + counts.medium + counts.high + counts.critical,
      },
    })
  }

  /**
   * Lista os tipos de ação já registrados (para o filtro da tela)
   */
  async getActions(_request: FastifyRequest, reply: FastifyReply) {
    const actions = await auditService.listActions()
    return reply.status(200).send({ data: actions })
  }
}

export const auditLogController = new AuditLogController()
