import type { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

async function authenticate(req: FastifyRequest, res: FastifyReply) {
	const token = req.headers.authorization?.replace('Bearer ', '')

	if (!token) {
		return res.status(401).send({ error: 'Token não fornecido' })
	}

	try {
		await req.jwtVerify()
	} catch (err) {
		console.error('Erro ao verificar o token JWT:', err)
		return res.status(450).send({ error: 'Token inválido' })
	}
}

async function authPlugin(app: FastifyInstance) {
	app.decorate('authenticate', authenticate)
}

export default fp(authPlugin)
