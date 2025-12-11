import type { FastifyInstance } from 'fastify'
import { UtiController } from '@/controllers/uti.controller'

export function utiRoutes(app: FastifyInstance) {
	const controller = new UtiController()

	// Rota específica para criar leito vazio (deve vir antes da rota genérica POST /)
	app.post('/empty', { preHandler: [app.authenticate] }, async (req, res) => controller.createEmpty(req, res))
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => controller.getAll(req, res))
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.getById(req, res))
	// Rota para gerar token de acesso à sala (deve vir antes de PUT /:id)
	 app.get('/:id/room-token', { preHandler: [app.authenticate] }, async (req, res) => controller.getRoomToken(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => controller.update(req, res))
}
