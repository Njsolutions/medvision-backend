import { z } from 'zod'

export const RealtimeQuerySchema = z.object({
	token: z.string().min(1, 'Token é obrigatório'),
})
