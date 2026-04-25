import { z } from 'zod'

export const GetAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

export type GetAuditLogsInput = z.infer<typeof GetAuditLogsSchema>
