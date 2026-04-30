import type { FastifyInstance } from 'fastify'
import { AdminController } from '@/modules/admin/admin.controller'

export function adminRoutes(app: FastifyInstance) {
	const controller = new AdminController(app)

	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => controller.listAll(req, res))
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
	app.delete('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.delete(req, res))
}
