import type { FastifyInstance } from 'fastify'
import { PatientController } from '@/controllers/patient.controller'
import { authenticate } from '@/plugins/auth.plugin'

export function patientRoutes(app: FastifyInstance) {
	const controller = new PatientController(app)

	app.post('/', { preHandler: [authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [authenticate] }, async (req, res) => controller.update(req, res))
}
