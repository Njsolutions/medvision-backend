import { z } from 'zod'

export const CreatePatientSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	cpf: z.string().length(11, 'CPF must be 11 characters long'),
	phone: z.string().min(10, 'Phone number is required'),
	email: z.string().email('Invalid email address'),
	age: z.number().int().min(0, 'Age must be a positive number'),
	gender: z.enum(['male', 'female', 'other']),
	address: z.any().optional(),
})

export const UpdatePatientSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	phone: z.string().min(10, 'Phone number is required').optional(),
	email: z.string().email('Invalid email address').optional(),
	age: z.number().int().min(0, 'Age must be a positive number').optional(),
	gender: z.enum(['male', 'female', 'other']).optional(),
	address: z.any().optional(),
	active: z.boolean().optional(),
})

export const PatientIdSchema = z.object({
	id: z.string().uuid('Invalid patient ID'),
})

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>
export type PatientIdInput = z.infer<typeof PatientIdSchema>
