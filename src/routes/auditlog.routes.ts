import type { FastifyInstance } from 'fastify'
import { auditLogController } from '../controllers/auditlog.controller'
import { GetAuditLogsSchema } from '../schemas/auditlog.schema'

export async function auditLogRoutes(app: FastifyInstance) {
  // Todas as rotas de auditoria requerem autenticação
  app.addHook('onRequest', app.authenticate)

  /**
   * Lista logs de auditoria com filtros
   * GET /audit-logs
   */
  app.get(
    '/',
    {
      schema: {
        description: 'Lista logs de auditoria com filtros opcionais',
        tags: ['Audit Logs'],
        querystring: GetAuditLogsSchema,
        response: {
          200: {
            description: 'Lista de logs de auditoria',
            type: 'object',
            properties: {
              data: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    auditLogController.getLogs
  )

  /**
   * Obtém estatísticas de logs
   * GET /audit-logs/statistics
   */
  app.get(
    '/statistics',
    {
      schema: {
        description: 'Obtém estatísticas dos logs por nível de impacto',
        tags: ['Audit Logs'],
        response: {
          200: {
            description: 'Estatísticas de logs',
            type: 'object',
            properties: {
              statistics: {
                type: 'object',
                properties: {
                  low: { type: 'number' },
                  medium: { type: 'number' },
                  high: { type: 'number' },
                  critical: { type: 'number' },
                  total: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    auditLogController.getStatistics
  )

  /**
   * Obtém logs de um usuário específico
   * GET /audit-logs/user/:userId
   */
  app.get(
    '/user/:userId',
    {
      schema: {
        description: 'Obtém logs de auditoria de um usuário específico',
        tags: ['Audit Logs'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
          required: ['userId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            description: 'Logs do usuário',
            type: 'object',
            properties: {
              data: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    auditLogController.getUserLogs
  )

  /**
   * Obtém logs por tipo de ação
   * GET /audit-logs/action/:action
   */
  app.get(
    '/action/:action',
    {
      schema: {
        description: 'Obtém logs de auditoria por tipo de ação',
        tags: ['Audit Logs'],
        params: {
          type: 'object',
          properties: {
            action: { type: 'string' },
          },
          required: ['action'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            description: 'Logs da ação',
            type: 'object',
            properties: {
              data: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    auditLogController.getActionLogs
  )
}
