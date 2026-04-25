import { Resend } from 'resend'
import type {
	EmailOptions,
	SendEmailResponse,
	AppointmentEmailData,
	PrescriptionEmailData,
	WelcomeEmailData,
	PasswordResetEmailData,
	VerificationEmailData,
	SecurityCodeEmailData,
	PasswordRecoveryCodeEmailData,
} from '../types/email.types'
import {
	appointmentConfirmationTemplate,
	appointmentReminderTemplate,
	appointmentCancelledTemplate,
	appointmentRescheduledTemplate,
	prescriptionReadyTemplate,
	welcomePatientTemplate,
	welcomeDoctorTemplate,
	passwordResetTemplate,
	accountVerificationTemplate,
	securityCodeTemplate,
	passwordRecoveryCodeTemplate,
} from '../utils/templates'

class EmailService {
	private resend: Resend
	private defaultFrom: string

	constructor() {
		const apiKey = process.env.RESEND_API_KEY
		if (!apiKey) {
			throw new Error('RESEND_API_KEY não está configurada')
		}

		this.resend = new Resend(apiKey)
		this.defaultFrom = process.env.EMAIL_FROM || 'MedVision <noreply@medvision.com>'
	}

	async sendEmail(options: EmailOptions): Promise<SendEmailResponse> {
		try {
			const { data, error } = await this.resend.emails.send({
				from: options.from || this.defaultFrom,
				to: Array.isArray(options.to) ? options.to : [options.to],
				subject: options.subject,
				html: options.html,
				cc: options.cc,
				bcc: options.bcc,
				replyTo: options.replyTo,
				attachments: options.attachments,
				tags: options.tags,
			})

			if (error) {
				throw new Error(`Erro ao enviar email: ${error.message}`)
			}

			return data as SendEmailResponse
		} catch (error) {
			console.error('Erro ao enviar email:', error)
			throw error
		}
	}

	// Templates de Compromisso
	async sendAppointmentConfirmation(
		to: string,
		data: AppointmentEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = appointmentConfirmationTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	async sendAppointmentReminder(
		to: string,
		data: AppointmentEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = appointmentReminderTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	async sendAppointmentCancelled(
		to: string,
		data: AppointmentEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = appointmentCancelledTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	async sendAppointmentRescheduled(
		to: string,
		data: AppointmentEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = appointmentRescheduledTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	// Templates de Prescrição
	async sendPrescriptionReady(
		to: string,
		data: PrescriptionEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = prescriptionReadyTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	// Templates de Boas-vindas
	async sendWelcomePatient(
		to: string,
		data: WelcomeEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = welcomePatientTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	async sendWelcomeDoctor(
		to: string,
		data: WelcomeEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = welcomeDoctorTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	// Templates de Autenticação
	async sendPasswordReset(
		to: string,
		data: PasswordResetEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = passwordResetTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	async sendAccountVerification(
		to: string,
		data: VerificationEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = accountVerificationTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	async sendSecurityCode(
		to: string,
		data: SecurityCodeEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = securityCodeTemplate(data)
		return this.sendEmail({ to, subject, html })
	}

	async sendPasswordRecoveryCode(
		to: string,
		data: PasswordRecoveryCodeEmailData,
	): Promise<SendEmailResponse> {
		const { subject, html } = passwordRecoveryCodeTemplate(data)
		return this.sendEmail({ to, subject, html })
	}
}

export const emailService = new EmailService()
