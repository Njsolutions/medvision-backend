import type { FastifyInstance } from 'fastify'
import { AuthController } from '@/controllers/auth.controller'
import { authenticate } from '@/plugins/auth.plugin'

export function authRoutes(app: FastifyInstance) {
	const controller = new AuthController(app)

	app.post('/register', async (req, res) => controller.register(req, res))
	app.get('/user-profile', { preHandler: [authenticate] }, async (req, res) => controller.userProfile(req, res))
	app.post('/sign-in', async (req, res) => controller.signIn(req, res))
	app.post('/request-reset-password', async (req, res) => controller.requestPasswordReset(req, res))
	app.post('/reset-password', async (req, res) => controller.resetPassword(req, res))
}
