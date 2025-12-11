import { z } from 'zod'

export const CreateAppointmentSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID'),
	doctorId: z.string().uuid('Invalid doctor ID'),
	appointmentDate: z.string().datetime('Invalid appointment date'),
	reason: z.string().min(1, 'Reason must not be empty').optional(),
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

export const ListAppointmentsSchema = z.object({
	status: z.enum(['scheduled', 'inProgress', 'completed', 'cancelled', 'noShow']).optional(),
	patientId: z.string().uuid('Invalid patient ID').optional(),
	doctorId: z.string().uuid('Invalid doctor ID').optional(),
	startDate: z.string().datetime('Invalid start date').optional(),
	endDate: z.string().datetime('Invalid end date').optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const AddPatientFeedbackSchema = z.object({
	feedbackPatient: z.string().min(1, 'Feedback is required').max(1000, 'Feedback must be at most 1000 characters'),
})

export const AddDoctorFeedbackSchema = z.object({
	feedbackDoctor: z.string().min(1, 'Feedback is required').max(1000, 'Feedback must be at most 1000 characters'),
})

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>
export type AppointmentIdInput = z.infer<typeof AppointmentIdSchema>
export type ListAppointmentsInput = z.infer<typeof ListAppointmentsSchema>
export type AddPatientFeedbackInput = z.infer<typeof AddPatientFeedbackSchema>
export type AddDoctorFeedbackInput = z.infer<typeof AddDoctorFeedbackSchema>
