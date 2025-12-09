import type { FastifyInstance } from 'fastify'
import { DoctorController } from '@/controllers/doctor.controller'
import { authenticate } from '@/plugins/auth.plugin'

export function doctorRoutes(app: FastifyInstance) {
	const controller = new DoctorController()

	app.post('/', { preHandler: [authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [authenticate] }, async (req, res) => controller.update(req, res))
}
