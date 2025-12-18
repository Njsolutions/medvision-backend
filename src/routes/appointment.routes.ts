import type { FastifyInstance } from 'fastify'
import { AppointmentController } from '@/controllers/appointment.controller'

export function appointmentRoutes(app: FastifyInstance) {
	const controller = new AppointmentController(app)

	// Rotas específicas primeiro
	app.post('/cancel-expired', { preHandler: [app.authenticate] }, async (req, res) => controller.cancelExpired(req, res))
	app.get('/:id/room-token', { preHandler: [app.authenticate] }, async (req, res) => controller.getRoomToken(req, res))
	app.post('/:id/feedback/patient', { preHandler: [app.authenticate] }, async (req, res) => controller.addPatientFeedback(req, res))
	app.post('/:id/feedback/doctor', { preHandler: [app.authenticate] }, async (req, res) => controller.addDoctorFeedback(req, res))
	
	// Rotas genéricas por último
	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => controller.list(req, res))
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
	app.patch('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
