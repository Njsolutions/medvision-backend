import type { FastifyInstance } from 'fastify'
import { AppointmentController } from '@/controllers/appointment.controller'

export function appointmentRoutes(app: FastifyInstance) {
	const controller = new AppointmentController(app)

	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
