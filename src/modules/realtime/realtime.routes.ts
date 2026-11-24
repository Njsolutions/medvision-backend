import { extractAccessToken } from '@/plugins/auth.plugin'
import { realtimeService } from '@/services/realtime.service'
import { sessionService } from '@/services/session.service'
import { isAllowedOrigin, parseAllowedOrigins } from '@/utils/security/origin'
import type { FastifyInstance, FastifyRequest } from 'fastify'

type RealtimeIdentity = {
	userId: string
	sessionId: string
	accessExpiresAt: Date
	role: string
	patientId: string | null
	doctorId: string | null
	utiAccess: boolean
}

// Identidade resolvida no preHandler (antes do upgrade) a partir da sessão no banco.
const identities = new WeakMap<FastifyRequest, RealtimeIdentity>()

export function realtimeRoutes(app: FastifyInstance) {
	app.get(
		'/',
		{
			websocket: true,
			preHandler: async (req, reply) => {
				const extracted = extractAccessToken(req)

				if (!extracted) {
					return reply.status(401).send({ error: 'Token não fornecido' })
				}

				// Handshake de WebSocket não tem proteção de CORS: com cookie, a origem precisa ser validada aqui.
				if (extracted.fromCookie && !isAllowedOrigin(req.headers.origin, parseAllowedOrigins(process.env.CORS_ORIGINS))) {
					return reply.status(403).send({ error: 'Origem não permitida' })
				}

				const result = await sessionService.authenticate(extracted.token)

				if (!result) {
					return reply.status(401).send({ error: 'Sessão inválida ou expirada' })
				}

				const { user, session } = result

				identities.set(req, {
					userId: user.id,
					sessionId: session.id,
					accessExpiresAt: session.accessExpiresAt,
					role: user.role,
					patientId: user.patient?.id ?? null,
					doctorId: user.doctor?.id ?? null,
					utiAccess: user.doctor?.utiAccess ?? false,
				})
			},
		},
		(socket, req) => {
			const identity = identities.get(req)

			if (!identity) {
				socket.close()
				return
			}

			const client = {
				socket,
				userId: identity.userId,
				sessionId: identity.sessionId,
				role: identity.role,
				patientId: identity.patientId,
				doctorId: identity.doctorId,
				utiAccess: identity.utiAccess,
				subscriptions: new Set<string>(),
			}

			const unregister = realtimeService.register(client)

			// O socket não pode viver mais que o token de acesso. O cliente reconecta e renova a sessão.
			const expiryTimer = setTimeout(
				() => socket.close(),
				Math.max(identity.accessExpiresAt.getTime() - Date.now(), 0),
			)

			socket.send(JSON.stringify({
				type: 'connection.ready',
				data: {
					userId: identity.userId,
					role: identity.role,
				},
				sentAt: new Date().toISOString(),
			}))

		socket.on('message', (rawMessage: unknown) => {
			try {
				const messageText = Buffer.isBuffer(rawMessage)
					? rawMessage.toString()
					: String(rawMessage)

				const message = JSON.parse(messageText) as {
					type?: string
					events?: unknown
				}

				if (message.type === 'subscribe' && Array.isArray(message.events)) {
					client.subscriptions = new Set(
						message.events.filter((event): event is string => typeof event === 'string')
					)
				}
			} catch {
				// Ignore invalid client messages. The socket can keep receiving broadcasts.
			}
		})

		socket.on('close', () => {
			clearTimeout(expiryTimer)
			unregister()
		})
	})

	app.get('/status', { preHandler: [app.authenticate] }, async (_req, res) => {
		return res.status(200).send({
			success: true,
			message: 'Realtime ativo',
			data: {
				connectedClients: realtimeService.getConnectedClientsCount(),
			},
		})
	})
}
