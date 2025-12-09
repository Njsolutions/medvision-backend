import { z } from 'zod'

export const CreateUtiSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID').optional(),
	status: z.enum(['available', 'occupied', 'maintenance']).default('available'),
	roomLink: z.string().url('Invalid room link').optional(),
})

export const UpdateUtiSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID').nullable().optional(),
	status: z.enum(['available', 'occupied', 'maintenance']).optional(),
	roomLink: z.string().url('Invalid room link').nullable().optional(),
})

export const UtiIdSchema = z.object({
	id: z.string().uuid('Invalid UTI ID'),
})

export type CreateUtiInput = z.infer<typeof CreateUtiSchema>
export type UpdateUtiInput = z.infer<typeof UpdateUtiSchema>
export type UtiIdInput = z.infer<typeof UtiIdSchema>
