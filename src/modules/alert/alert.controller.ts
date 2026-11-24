import { CreateAlertSchema } from '@/modules/alert/alert.schema'
import { alertService } from '@/modules/alert/alert.service'
import { resolveSession } from '@/plugins/auth.plugin'
import { rateLimitService } from '@/services/ratelimit.service'
import type { FastifyReply, FastifyRequest } from 'fastify'

const PER_IP_LIMIT = { windowMs: 60 * 1000, maxRequests: 10 }
const GLOBAL_LIMIT = { windowMs: 60 * 1000, maxRequests: 60 }

export class AlertController {
	// Público de propósito: erros de tela de login e falhas antes da autenticação também precisam ser reportados.
	// A identidade só vem de token válido; nada do que o cliente envia sobre si mesmo é usado.
	async create(req: FastifyRequest, res: FastifyReply) {
		if (
			rateLimitService.isLimited(`alerts:ip:${req.ip}`, PER_IP_LIMIT) ||
			rateLimitService.isLimited('alerts:global', GLOBAL_LIMIT)
		) {
			return res.status(429).send({ error: 'Limite de alertas excedido' })
		}

		const data = CreateAlertSchema.safeParse(req.body)

		if (!data.success) {
			return res.status(400).send({ error: 'Dados da requisição inválidos' })
		}

		let user: { id: string; role: string } | undefined
		try {
			const session = await resolveSession(req)
			if (session) user = { id: session.user.id, role: session.user.role }
		} catch {
			user = undefined
		}

		// Não bloqueia a resposta do cliente.
		void alertService.send(data.data, user)

		return res.status(202).send({ message: 'Alerta recebido' })
	}
}
