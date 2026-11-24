import { AlertController } from '@/modules/alert/alert.controller'
import type { FastifyInstance } from 'fastify'

export function alertRoutes(app: FastifyInstance) {
	const controller = new AlertController()

	app.post('/', async (req, res) => controller.create(req, res))
}
