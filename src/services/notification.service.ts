import axios from 'axios'
import { emailService } from '@/services/email.service'
import type { SendNotificationInput } from '@/modules/notification/notification.schema'

type ChannelResult = {
	channel: 'email' | 'whatsapp' | 'sms'
	success: boolean
	skipped?: boolean
	message?: string
	providerResponse?: unknown
}

class NotificationService {
	async send(data: SendNotificationInput) {
		const results: ChannelResult[] = []

		for (const channel of data.channels) {
			if (channel === 'email') results.push(await this.sendEmail(data))
			if (channel === 'whatsapp') results.push(await this.sendWebhookChannel('whatsapp', data.to.phone, data.message))
			if (channel === 'sms') results.push(await this.sendWebhookChannel('sms', data.to.phone, data.message))
		}

		return results
	}

	private async sendEmail(data: SendNotificationInput): Promise<ChannelResult> {
		if (!data.to.email) {
			return {
				channel: 'email',
				success: false,
				skipped: true,
				message: 'Email do destinatário não informado',
			}
		}

		try {
			const response = await emailService.sendEmail({
				to: data.to.email,
				subject: data.subject || 'Notificação MedVision',
				html: `<p>${data.message.replace(/\n/g, '<br>')}</p>`,
			})

			return { channel: 'email', success: true, providerResponse: response }
		} catch (error: any) {
			return {
				channel: 'email',
				success: false,
				message: error?.message || 'Erro ao enviar email',
			}
		}
	}

	private async sendWebhookChannel(
		channel: 'whatsapp' | 'sms',
		phone: string | undefined,
		message: string,
	): Promise<ChannelResult> {
		if (!phone) {
			return {
				channel,
				success: false,
				skipped: true,
				message: 'Telefone do destinatário não informado',
			}
		}

		const url = channel === 'whatsapp' ? process.env.WHATSAPP_API_URL : process.env.SMS_API_URL
		const token = channel === 'whatsapp' ? process.env.WHATSAPP_API_TOKEN : process.env.SMS_API_TOKEN

		if (!url) {
			return {
				channel,
				success: false,
				skipped: true,
				message: `Provider de ${channel} não configurado`,
			}
		}

		try {
			const response = await axios.post(
				url,
				{ to: phone, message },
				{ headers: token ? { Authorization: `Bearer ${token}` } : undefined },
			)

			return { channel, success: true, providerResponse: response.data }
		} catch (error: any) {
			return {
				channel,
				success: false,
				message: error?.response?.data?.message || error?.message || `Erro ao enviar ${channel}`,
			}
		}
	}
}

export const notificationService = new NotificationService()
