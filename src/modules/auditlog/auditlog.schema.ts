import { z } from 'zod'

export const GetAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type GetAuditLogsInput = z.infer<typeof GetAuditLogsSchema>
