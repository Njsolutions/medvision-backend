import { z } from 'zod'

export const NotificationChannelSchema = z.enum(['email', 'whatsapp', 'sms'])

export const SendNotificationSchema = z.object({
	channels: z.array(NotificationChannelSchema).min(1, 'Informe pelo menos um canal'),
	to: z.object({
		email: z.string().email('Email inválido').optional(),
		phone: z.string().min(10, 'Telefone inválido').optional(),
	}),
	subject: z.string().min(1, 'Assunto é obrigatório').optional(),
	message: z.string().min(1, 'Mensagem é obrigatória'),
})

export type SendNotificationInput = z.infer<typeof SendNotificationSchema>
