import { z } from 'zod'

// Schema para medicamento individual
export const medicamentoSchema = z.object({
	nome: z.string().min(1, 'Nome do medicamento é obrigatório'),
	dosagem: z.string().min(1, 'Dosagem é obrigatória'),
	frequencia: z.string().min(1, 'Frequência é obrigatória'),
	duracao: z.string().min(1, 'Duração é obrigatória'),
	via: z.string().min(1, 'Via de administração é obrigatória'),
	orientacoes: z.string().optional(),
})

// Schema para criar prescrição
export const createPrescriptionSchema = z.object({
	patientId: z.string().uuid('ID do paciente inválido'),
	doctorId: z.string().uuid('ID do médico inválido'),
	appointmentId: z
		.string()
		.uuid('ID do agendamento inválido')
		.optional()
		.nullable(),
	medicamentos: z
		.array(medicamentoSchema)
		.min(1, 'Deve haver pelo menos um medicamento'),
	orientacoesGerais: z.string().optional().nullable(),
})

// Schema para atualizar prescrição
export const updatePrescriptionSchema = z.object({
	orientacoesGerais: z.string().optional().nullable(),
	medicamentos: z.array(medicamentoSchema).min(1).optional(),
})

// Schema para query params de listagem
export const listPrescriptionQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
	doctorId: z.string().uuid().optional(),
	appointmentId: z.string().uuid().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10),
})

// Schema para parâmetros de rota
export const prescriptionParamsSchema = z.object({
	id: z.string().uuid('ID da prescrição inválido'),
})

// Types exportados
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>
export type ListPrescriptionQuery = z.infer<typeof listPrescriptionQuerySchema>
export type PrescriptionParams = z.infer<typeof prescriptionParamsSchema>
export type MedicamentoInput = z.infer<typeof medicamentoSchema>
