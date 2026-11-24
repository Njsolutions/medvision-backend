import type { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { sessionService } from '@/services/session.service'
import { parseAllowedOrigins, passesCsrfCheck } from '@/utils/security/origin'
import { ACCESS_COOKIE } from '@/utils/session-cookies'

/**
 * Token de acesso: cookie HttpOnly (navegador) ou `Authorization: Bearer` (clientes sem navegador).
 * O cookie tem prioridade.
 */
export function extractAccessToken(req: FastifyRequest): { token: string; fromCookie: boolean } | null {
	const cookieToken = req.cookies?.[ACCESS_COOKIE]
	if (cookieToken) return { token: cookieToken, fromCookie: true }

	const header = req.headers.authorization
	if (header?.startsWith('Bearer ')) {
		const bearer = header.slice('Bearer '.length).trim()
		if (bearer) return { token: bearer, fromCookie: false }
	}

	return null
}

/** Resolve a sessão sem responder ao cliente. Usado por rotas com autenticação opcional. */
export async function resolveSession(req: FastifyRequest) {
	const extracted = extractAccessToken(req)
	if (!extracted) return null

	return sessionService.authenticate(extracted.token)
}

async function authenticate(req: FastifyRequest, res: FastifyReply) {
	const extracted = extractAccessToken(req)

	if (!extracted) {
		return res.status(401).send({ error: 'Token não fornecido' })
	}

	if (
		!passesCsrfCheck({
			method: req.method,
			origin: req.headers.origin,
			usesCookie: extracted.fromCookie,
			allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGINS),
		})
	) {
		return res.status(403).send({ error: 'Origem não permitida' })
	}

	try {
		const result = await sessionService.authenticate(extracted.token)

		if (!result) {
			return res.status(401).send({ error: 'Sessão inválida ou expirada' })
		}

		const { user, session } = result

		req.sessionId = session.id
		req.user = {
			id: user.id,
			userId: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			doctorId: user.doctor?.id,
			patientId: user.patient?.id,
			utiAccess: user.doctor?.utiAccess,
		}
	} catch (err) {
		req.log.error({ err }, 'Erro ao validar a sessão')
		return res.status(500).send({ error: 'Erro interno do servidor' })
	}
}

async function authPlugin(app: FastifyInstance) {
	app.decorate('authenticate', authenticate)
}

export default fp(authPlugin)
