import { z } from 'zod'

export const RequestTypeSchema = z.enum([
	'appointment',
	'prescription',
	'consultation',
	'utiAdmission',
	'medicalCertificate',
	'attendanceDeclaration',
	'other',
])

export const REQUEST_TYPE_OPTIONS = [
	{ value: 'appointment', label: 'Solicitação de consulta' },
	{ value: 'prescription', label: 'Solicitação de prescrição' },
	{ value: 'consultation', label: 'Solicitação de consulta médica' },
	{ value: 'utiAdmission', label: 'Solicitação de internação em UTI' },
	{ value: 'medicalCertificate', label: 'Atestado médico' },
	{ value: 'attendanceDeclaration', label: 'Declaração de comparecimento' },
	{ value: 'other', label: 'Outros' },
] as const

const requestTypeAliases: Record<string, z.infer<typeof RequestTypeSchema>> = {
	atestado_medico: 'medicalCertificate',
	'atestado médico': 'medicalCertificate',
	'atestado medico': 'medicalCertificate',
	declaracao_comparecimento: 'attendanceDeclaration',
	'declaração de comparecimento': 'attendanceDeclaration',
	'declaracao de comparecimento': 'attendanceDeclaration',
}

const normalizeRequestType = (value: string) => requestTypeAliases[value.trim().toLowerCase()] ?? value

// Schema para uma única solicitação
const SolicitacaoSchema = z.object({
	tipo: z.string().min(1, 'O tipo da solicitação é obrigatório').transform(normalizeRequestType).pipe(RequestTypeSchema),
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
	type: RequestTypeSchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Tipos inferidos
export type CreateRequestsInput = z.infer<typeof CreateRequestsSchema>
export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>
export type ListRequestsInput = z.infer<typeof ListRequestsSchema>
