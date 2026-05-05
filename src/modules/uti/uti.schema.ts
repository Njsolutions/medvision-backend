import { z } from 'zod'

export const CreateUtiSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID').optional().nullable(),
	status: z.enum(['available', 'occupied', 'disinfecting']).default('available'),
})

export const UpdateUtiSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID').nullable().optional(),
	status: z.enum(['available', 'occupied', 'disinfecting']).optional(),
	roomLink: z.string().url('Invalid room link').nullable().optional(),
	roomName: z.string().nullable().optional(),
})

export const UtiIdSchema = z.object({
	id: z.string().uuid('Invalid UTI ID'),
})

export const UtiVisitorInviteSchema = z.object({
	whatsapp: z
		.string()
		.min(10, 'Telefone invÃ¡lido')
		.transform((value) => value.replace(/\D/g, ''))
		.refine((value) => value.length >= 10 && value.length <= 15, 'Telefone invÃ¡lido'),
}).partial()

export type CreateUtiInput = z.infer<typeof CreateUtiSchema>
export type UpdateUtiInput = z.infer<typeof UpdateUtiSchema>
export type UtiIdInput = z.infer<typeof UtiIdSchema>
export type UtiVisitorInviteInput = z.infer<typeof UtiVisitorInviteSchema>
