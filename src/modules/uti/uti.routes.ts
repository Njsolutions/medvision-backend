import { UtiController } from '@/modules/uti/uti.controller'
import type { FastifyInstance } from 'fastify'

export function utiRoutes(app: FastifyInstance) {
	const controller = new UtiController()

	app.post('/empty', { preHandler: [app.authenticate] }, async (req, res) => controller.createEmpty(req, res))
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => controller.getAll(req, res))
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.getById(req, res))
	app.get('/:id/room-token', { preHandler: [app.authenticate] }, async (req, res) => controller.getRoomToken(req, res))
	app.post('/:id/visitor-invite', { preHandler: [app.authenticate] }, async (req, res) => controller.inviteVisitor(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
