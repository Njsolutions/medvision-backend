import { z } from 'zod'

export const DashboardQuerySchema = z.object({
	months: z.coerce.number().int().min(2).max(12).default(6),
})

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>
