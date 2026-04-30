import type { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { db } from '@/lib/prisma'

async function authenticate(req: FastifyRequest, res: FastifyReply) {
	const token = req.headers.authorization?.replace('Bearer ', '')

	if (!token) {
		return res.status(401).send({ error: 'Token não fornecido' })
	}

	try {
		await req.jwtVerify()

		if (!req.user?.id) {
			return res.status(401).send({ error: 'Token inválido' })
		}

		const user = await db.user.findUnique({
			where: { id: req.user.id },
			include: {
				doctor: { select: { id: true } },
				patient: { select: { id: true } },
			},
		})

		if (!user || !user.active) {
			return res.status(401).send({ error: 'Usuário inativo ou não encontrado' })
		}

		req.user = {
			...req.user,
			id: user.id,
			userId: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			doctorId: user.doctor?.id,
			patientId: user.patient?.id,
		}
	} catch (err) {
		console.error('Erro ao verificar o token JWT:', err)
		return res.status(450).send({ error: 'Token inválido' })
	}
}

async function authPlugin(app: FastifyInstance) {
	app.decorate('authenticate', authenticate)
}

export default fp(authPlugin)
