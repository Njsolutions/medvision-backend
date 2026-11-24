import type { FastifyInstance } from 'fastify'
import { auditLogController } from './auditlog.controller'
import { GetAuditLogsSchema } from './auditlog.schema'

export async function auditLogRoutes(app: FastifyInstance) {
  // Auditoria é restrita ao usuário master
  app.addHook('onRequest', app.authenticate)
  app.addHook('preHandler', async (req, res) => {
    if (req.user?.role !== 'master') {
      return res.status(403).send({ error: 'Apenas o usuário master pode acessar a auditoria' })
    }
  })

  /**
   * GET /audit-logs — lista logs (filtros: userId, action, impactLevel, search, startDate, endDate)
   */
  app.get(
    '/',
    {
      schema: {
        description: 'Lista logs de auditoria com filtros combinados (somente master)',
        tags: ['Audit Logs'],
        querystring: GetAuditLogsSchema,
      },
    },
    auditLogController.getLogs
  )

  /**
   * GET /audit-logs/statistics — contagem por nível de impacto
   */
  app.get(
    '/statistics',
    {
      schema: {
        description: 'Contagem de logs por nível de impacto (somente master)',
        tags: ['Audit Logs'],
      },
    },
    auditLogController.getStatistics
  )

  /**
   * GET /audit-logs/actions — tipos de ação registrados
   */
  app.get(
    '/actions',
    {
      schema: {
        description: 'Tipos de ação registrados nos logs (somente master)',
        tags: ['Audit Logs'],
      },
    },
    auditLogController.getActions
  )
}
