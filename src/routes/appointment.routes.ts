import type { FastifyInstance } from 'fastify'
import { AppointmentController } from '@/controllers/appointment.controller'
import { authenticate } from '@/plugins/auth.plugin'

export function appointmentRoutes(app: FastifyInstance) {
	const controller = new AppointmentController(app)

	app.post('/', { preHandler: [authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [authenticate] }, async (req, res) => controller.update(req, res))
}
