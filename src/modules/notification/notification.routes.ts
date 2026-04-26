import { NotificationController } from '@/modules/notification/notification.controller'
import type { FastifyInstance } from 'fastify'

export function notificationRoutes(app: FastifyInstance) {
	const controller = new NotificationController()

	app.post('/send', { preHandler: [app.authenticate] }, async (req, res) => controller.send(req, res))
}
