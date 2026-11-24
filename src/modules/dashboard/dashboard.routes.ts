import { DashboardController } from '@/modules/dashboard/dashboard.controller'
import type { FastifyInstance } from 'fastify'

export function dashboardRoutes(app: FastifyInstance) {
	const controller = new DashboardController()

	app.get('/stats', { preHandler: [app.authenticate] }, async (req, res) => controller.getStats(req, res))
}
