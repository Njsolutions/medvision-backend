import { z } from 'zod'

export const CreateDoctorSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	cpf: z.string().length(11, 'CPF must be 11 characters long'),
	phone: z.string().min(10, 'Phone number is required'),
	email: z.string().email('Invalid email address'),
	crm: z.string().min(1, 'CRM is required').max(20, 'CRM must be at most 20 characters'),
	specialty: z.string().min(1, 'Specialty is required'),
	monthlySlots: z.number().int().min(0).default(0),
	weeklyAvailability: z.any().optional(),
	utiAccess: z.boolean().default(false),
})

export const UpdateDoctorSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	phone: z.string().min(10, 'Phone number is required').optional(),
	email: z.string().email('Invalid email address').optional(),
	crm: z.string().min(1, 'CRM is required').max(20, 'CRM must be at most 20 characters').optional(),
	specialty: z.string().min(1, 'Specialty is required').optional(),
	monthlySlots: z.number().int().min(0).optional(),
	weeklyAvailability: z.any().optional(),
	status: z.enum(['active', 'inactive', 'onLeave']).optional(),
	utiAccess: z.boolean().optional(),
	active: z.boolean().optional(),
})

export const DoctorIdSchema = z.object({
	id: z.string().uuid('Invalid doctor ID'),
})

export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>
export type DoctorIdInput = z.infer<typeof DoctorIdSchema>
