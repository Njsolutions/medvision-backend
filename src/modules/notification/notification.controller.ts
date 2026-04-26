import { SendNotificationSchema } from '@/modules/notification/notification.schema'
import { auditService } from '@/services/audit.service'
import { notificationService } from '@/services/notification.service'
import type { FastifyReply, FastifyRequest } from 'fastify'

export class NotificationController {
	async send(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user?.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({
					success: false,
					message: 'Permissão negada',
				})
			}

			const data = SendNotificationSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({
					success: false,
					message: 'Dados de entrada inválidos',
					errors: data.error.issues,
				})
			}

			const results = await notificationService.send(data.data)

			if (req.user?.id) {
				await auditService.log({
					userId: req.user.id,
					action: 'SEND_NOTIFICATION',
					description: `Enviou notificação pelos canais: ${data.data.channels.join(', ')}`,
					content: {
						channels: data.data.channels,
						results,
					},
					impactLevel: 'medium',
					ipAddress: req.ip,
					userAgent: req.headers['user-agent'],
				})
			}

			return res.status(200).send({
				success: true,
				message: 'Notificação processada',
				data: results,
			})
		} catch (error: any) {
			console.error('Erro ao enviar notificação:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao enviar notificação',
				error: error.message,
			})
		}
	}
}
