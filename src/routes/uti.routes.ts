import type { FastifyInstance } from 'fastify'
import { UtiController } from '@/controllers/uti.controller'

export function utiRoutes(app: FastifyInstance) {
	const controller = new UtiController()

	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
