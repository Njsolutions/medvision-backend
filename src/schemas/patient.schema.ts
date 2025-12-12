import { z } from 'zod'

export const CreatePatientSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
	phone: z.string().min(10, 'Telefone é obrigatório'),
	email: z.string().email('Email inválido').optional().or(z.literal('')),
	motherName: z.string().optional(),
	age: z.number().int().min(0, 'Idade deve ser um número positivo'),
	birthDate: z.string().datetime('Data de nascimento inválida').or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar no formato AAAA-MM-DD ou ISO 8601')).optional(),
	gender: z.enum(['male', 'female', 'indefinido', 'ignorado'], {
		errorMap: () => ({ message: 'Gênero inválido. Use: male, female, indefinido ou ignorado' })
	}),
	address: z.any().optional(),
})

export const UpdatePatientSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório').optional(),
	phone: z.string().min(10, 'Telefone é obrigatório').optional(),
	email: z.string().email('Email inválido').optional().or(z.literal('')),
	motherName: z.string().optional(),
	age: z.number().int().min(0, 'Idade deve ser um número positivo').optional(),
	birthDate: z.string().datetime('Data de nascimento inválida').or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar no formato AAAA-MM-DD ou ISO 8601')).optional(),
	gender: z.enum(['male', 'female', 'indefinido', 'ignorado'], {
		errorMap: () => ({ message: 'Gênero inválido. Use: male, female, indefinido ou ignorado' })
	}).optional(),
	address: z.any().optional(),
	active: z.boolean().optional(),
})

export const PatientIdSchema = z.object({
	id: z.string().uuid('ID do paciente inválido'),
})

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>
export type PatientIdInput = z.infer<typeof PatientIdSchema>
