import { z } from 'zod'

export const CreateAppointmentSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID'),
	doctorId: z.string().uuid('Invalid doctor ID'),
	appointmentDate: z.string().datetime('Invalid appointment date'),
	reason: z.string().min(1, 'Reason is required'),
	durationMinutes: z.number().int().min(15).max(480).default(30),
	notes: z.string().optional(),
})

export const UpdateAppointmentSchema = z.object({
	appointmentDate: z.string().datetime('Invalid appointment date').optional(),
	reason: z.string().min(1, 'Reason is required').optional(),
	status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled', 'noShow']).optional(),
	durationMinutes: z.number().int().min(15).max(480).optional(),
	notes: z.string().optional(),
	feedbackPatient: z.string().optional(),
	feedbackDoctor: z.string().optional(),
})

export const AppointmentIdSchema = z.object({
	id: z.string().uuid('Invalid appointment ID'),
})

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>
export type AppointmentIdInput = z.infer<typeof AppointmentIdSchema>
