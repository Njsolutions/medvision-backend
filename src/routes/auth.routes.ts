import type { FastifyInstance } from 'fastify'
import { AuthController } from '@/controllers/auth.controller'

export function authRoutes(app: FastifyInstance) {
	const controller = new AuthController(app)

	app.post('/register', async (req, res) => controller.register(req, res))
	app.get('/user-profile', { preHandler: [app.authenticate] }, async (req, res) => controller.userProfile(req, res))
	app.post('/signin', async (req, res) => controller.signIn(req, res))
	app.post('/forgot-password', async (req, res) => controller.requestPasswordReset(req, res))
	app.post('/validate-code', async (req, res) => controller.validateResetCode(req, res))
	app.post('/reset-password', async (req, res) => controller.resetPassword(req, res))
}
