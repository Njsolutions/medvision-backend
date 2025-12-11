import type { FastifyInstance } from 'fastify'
import { AppointmentController } from '@/controllers/appointment.controller'

export function appointmentRoutes(app: FastifyInstance) {
	const controller = new AppointmentController(app)

	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => controller.list(req, res))
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
	app.post('/:id/feedback/patient', { preHandler: [app.authenticate] }, async (req, res) => controller.addPatientFeedback(req, res))
	app.post('/:id/feedback/doctor', { preHandler: [app.authenticate] }, async (req, res) => controller.addDoctorFeedback(req, res))
}
