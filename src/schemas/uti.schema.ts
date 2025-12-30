import { z } from 'zod'

export const CreateUtiSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID').optional().nullable(),
	status: z.enum(['available', 'occupied']).default('available'),
	// roomLink removido do schema pois será gerado automaticamente
})

export const UpdateUtiSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID').nullable().optional(),
	status: z.enum(['available', 'occupied']).optional(),
	roomLink: z.string().url('Invalid room link').nullable().optional(),
	roomName: z.string().nullable().optional(),
})

export const UtiIdSchema = z.object({
	id: z.string().uuid('Invalid UTI ID'),
})

export type CreateUtiInput = z.infer<typeof CreateUtiSchema>
export type UpdateUtiInput = z.infer<typeof UpdateUtiSchema>
export type UtiIdInput = z.infer<typeof UtiIdSchema>
