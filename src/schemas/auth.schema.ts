import z from 'zod'

export const RegisterUserSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	cpf: z.string().length(11, 'CPF must be 11 characters long'),
	phone: z.string().min(10, 'Phone number is required'),
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
	role: z.enum(['master', 'admin']).optional(),
})

export const SignInSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters long'),
})

export const RequestPasswordResetSchema = z.object({
	email: z.string().email('Invalid email address'),
})

export const ResetPasswordSchema = z.object({
	email: z.string().email('Invalid email address'),
	newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
})

export const UpdateUserProfileSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	phone: z.string().min(10, 'Phone number is required').optional(),
	email: z.string().email('Invalid email address').optional(),
})

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>
export type SignInInput = z.infer<typeof SignInSchema>
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>
