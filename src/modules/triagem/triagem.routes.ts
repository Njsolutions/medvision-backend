import type { FastifyInstance } from 'fastify'
import { TriagemController } from '@/modules/triagem/triagem.controller'

export function triagemRoutes(app: FastifyInstance) {
	const controller = new TriagemController(app)

	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => controller.getAll(req, res))
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.getById(req, res)
	)
	app.get('/patient/:patientId', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.getByPatientId(req, res)
	)
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => controller.create(req, res))
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.update(req, res)
	)
	app.delete('/:id', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.delete(req, res)
	)
}
