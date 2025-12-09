import type { FastifyReply, FastifyRequest } from 'fastify'

export async function authenticate(req: FastifyRequest, res: FastifyReply) {
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
