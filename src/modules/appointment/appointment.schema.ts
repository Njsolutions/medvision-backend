import { z } from 'zod'

export const CreateAppointmentSchema = z.object({
	patientId: z.string().uuid('ID do paciente inválido'),
	doctorId: z.string().uuid('ID do médico inválido'),
	appointmentDate: z.string().datetime('Data da consulta inválida').refine((date) => {
		const appointmentDate = new Date(date)
		const now = new Date()
		// Adiciona margem de 5 minutos para evitar problemas de sincronização
		const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
		return appointmentDate > fiveMinutesAgo
	}, {
		message: 'A data da consulta não pode ser no passado',
	}),
	reason: z.string().min(1, 'O motivo não pode estar vazio').optional(),
	durationMinutes: z.number().int().min(15).max(480).optional(),
	notes: z.string().optional(),
})

export const UpdateAppointmentSchema = z.object({
	appointmentDate: z.string().datetime('Data da consulta inválida').refine((date) => {
		const appointmentDate = new Date(date)
		const now = new Date()
		// Adiciona margem de 5 minutos para evitar problemas de sincronização
		const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
		return appointmentDate > fiveMinutesAgo
	}, {
		message: 'A data da consulta não pode ser no passado',
	}).optional(),
	reason: z.string().min(1, 'O motivo é obrigatório').optional(),
	status: z.enum(['scheduled', 'inProgress', 'in_progress', 'completed', 'cancelled', 'noShow', 'no_show']).transform((val) => {
		// Converte snake_case para camelCase
		if (val === 'in_progress') return 'inProgress'
		if (val === 'no_show') return 'noShow'
		return val as 'scheduled' | 'inProgress' | 'completed' | 'cancelled' | 'noShow'
	}).optional(),
	durationMinutes: z.number().int().min(15).max(480).optional(),
	notes: z.string().optional(),
	feedbackPatient: z.string().optional(),
	feedbackDoctor: z.string().optional(),
})

export const AppointmentIdSchema = z.object({
	id: z.string().uuid('ID de consulta inválido'),
})

export const ListAppointmentsSchema = z.object({
	status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled', 'noShow']).optional(),
	patientId: z.string().uuid('ID do paciente inválido').optional(),
	doctorId: z.string().uuid('ID do médico inválido').optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const AddPatientFeedbackSchema = z.object({
	feedbackPatient: z.string().min(1, 'O feedback é obrigatório').max(1000, 'O feedback deve ter no máximo 1000 caracteres'),
})

export const AddDoctorFeedbackSchema = z.object({
	feedbackDoctor: z.string().min(1, 'O feedback é obrigatório').max(1000, 'O feedback deve ter no máximo 1000 caracteres'),
})

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>
export type AppointmentIdInput = z.infer<typeof AppointmentIdSchema>
export type ListAppointmentsInput = z.infer<typeof ListAppointmentsSchema>
export type AddPatientFeedbackInput = z.infer<typeof AddPatientFeedbackSchema>
export type AddDoctorFeedbackInput = z.infer<typeof AddDoctorFeedbackSchema>
