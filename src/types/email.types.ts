export interface EmailOptions {
	to: string | string[]
	subject: string
	html: string
	from?: string
	cc?: string | string[]
	bcc?: string | string[]
	replyTo?: string | string[]
	attachments?: EmailAttachment[]
	tags?: EmailTag[]
}

export interface EmailAttachment {
	filename: string
	content: Buffer | string
	contentType?: string
	path?: string
}

export interface EmailTag {
	name: string
	value: string
}

export interface SendEmailResponse {
	id: string
	from: string
	to: string[]
	created_at: string
}

export interface EmailTemplate {
	subject: string
	html: string
}

export enum EmailTemplateType {
	APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
	APPOINTMENT_REMINDER = 'appointment_reminder',
	APPOINTMENT_CANCELLED = 'appointment_cancelled',
	APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
	PRESCRIPTION_READY = 'prescription_ready',
	WELCOME_PATIENT = 'welcome_patient',
	WELCOME_DOCTOR = 'welcome_doctor',
	PASSWORD_RESET = 'password_reset',
	ACCOUNT_VERIFICATION = 'account_verification',
	MEDICAL_REPORT = 'medical_report',
}

export interface AppointmentEmailData {
	patientName: string
	doctorName: string
	appointmentDate: string
	appointmentTime: string
	specialty?: string
	location?: string
	meetingUrl?: string
	notes?: string
}

export interface PrescriptionEmailData {
	patientName: string
	doctorName: string
	prescriptionDate: string
	medications: string[]
	instructions?: string
}

export interface WelcomeEmailData {
	name: string
	email: string
	loginUrl?: string
	setPasswordUrl?: string // Link de uso único para definir a senha no primeiro acesso
	expiresIn?: string
}

export interface PasswordResetEmailData {
	name: string
	resetUrl: string
	expiresIn: string
}

export interface VerificationEmailData {
	name: string
	verificationUrl: string
	expiresIn: string
}

export interface SecurityCodeEmailData {
	name: string
	securityCode: string
	expiresIn?: string
}

export interface PasswordRecoveryCodeEmailData {
	name: string
	recoveryCode: string
	expiresIn?: string
}
