import { z } from 'zod'

export const CreateAdminSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	cpf: z.string().length(11, 'CPF must be 11 characters long'),
	phone: z.string().min(10, 'Phone number is required'),
	email: z.string().email('Invalid email address'),
	utiAccess: z.boolean().default(false),
})

export const UpdateAdminSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	phone: z.string().min(10, 'Phone number is required').optional(),
	email: z.string().email('Invalid email address').optional(),
	utiAccess: z.boolean().optional(),
	active: z.boolean().optional(),
})

export const AdminIdSchema = z.object({
	id: z.string().uuid('Invalid admin ID'),
})

export type CreateAdminInput = z.infer<typeof CreateAdminSchema>
export type UpdateAdminInput = z.infer<typeof UpdateAdminSchema>
export type AdminIdInput = z.infer<typeof AdminIdSchema>
