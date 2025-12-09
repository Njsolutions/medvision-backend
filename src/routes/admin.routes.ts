import type { FastifyInstance } from 'fastify'
import { AdminController } from '@/controllers/admin.controller'
import { authenticate } from '@/plugins/auth.plugin'

export function adminRoutes(app: FastifyInstance) {
	const controller = new AdminController(app)

	app.post('/', /* { preHandler: [authenticate] }, */ async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [authenticate] }, async (req, res) => controller.update(req, res))
}
