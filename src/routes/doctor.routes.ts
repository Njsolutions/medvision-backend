import type { FastifyInstance } from 'fastify'
import { DoctorController } from '@/controllers/doctor.controller'

export function doctorRoutes(app: FastifyInstance) {
	const controller = new DoctorController()

	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => controller.getAll(req, res))
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.getById(req, res))
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
