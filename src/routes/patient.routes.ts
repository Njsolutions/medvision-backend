import type { FastifyInstance } from 'fastify'
import { PatientController } from '@/controllers/patient.controller'

export function patientRoutes(app: FastifyInstance) {
	const controller = new PatientController(app)

	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
