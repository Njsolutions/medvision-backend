import type { FastifyInstance } from 'fastify'
import { AdminController } from '@/modules/admin/admin.controller'

export function adminRoutes(app: FastifyInstance) {
	const controller = new AdminController(app)

	app.post('/', /* { preHandler: [app.authenticate] }, */ async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
