import { z } from 'zod'

// Schema para uma única solicitação
const SolicitacaoSchema = z.object({
	tipo: z.string().min(1, 'O tipo da solicitação é obrigatório'),
	descricao: z.string().min(1, 'A descrição é obrigatória'),
	observacoes: z.string().optional(),
})

// Schema para criar múltiplas solicitações
export const CreateRequestsSchema = z.object({
	patientId: z.string().uuid('ID do paciente inválido'),
	doctorId: z.string().uuid('ID do médico inválido'),
	appointmentId: z.string().uuid('ID da consulta inválido').optional(),
	solicitacoes: z.array(SolicitacaoSchema).min(1, 'É necessário pelo menos uma solicitação'),
})

// Schema para atualizar uma solicitação individual
export const UpdateRequestSchema = z.object({
	status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']).optional(),
	details: z.record(z.string(), z.any()).optional(),
})

// Schema para ID de solicitação
export const RequestIdSchema = z.object({
	id: z.string().uuid('ID de solicitação inválido'),
})

// Schema para listar solicitações
export const ListRequestsSchema = z.object({
	status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']).optional(),
	patientId: z.string().uuid('ID do paciente inválido').optional(),
	doctorId: z.string().uuid('ID do médico inválido').optional(),
	type: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Tipos inferidos
export type CreateRequestsInput = z.infer<typeof CreateRequestsSchema>
export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>
export type ListRequestsInput = z.infer<typeof ListRequestsSchema>
