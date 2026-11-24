import { z } from 'zod'

// Só campos curtos e descritivos. Sem payload de requisição nem corpo de resposta:
// esses campos podem conter dados de pacientes e não saem da API.
export const CreateAlertSchema = z.object({
	title: z.string().trim().min(1).max(100),
	message: z.string().trim().min(1).max(500),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	screen: z.string().trim().max(200).optional(),
	action: z.string().trim().max(100).optional(),
	endpoint: z.string().trim().max(200).optional(),
	statusCode: z.number().int().min(100).max(599).optional(),
})

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>
