import { RealtimeQuerySchema } from '@/modules/realtime/realtime.schema'
import { realtimeService } from '@/services/realtime.service'
import type { JWTPayload } from '@/types/auth.types'
import type { FastifyInstance } from 'fastify'

export function realtimeRoutes(app: FastifyInstance) {
	app.get('/', { websocket: true }, (socket, req) => {
		const query = RealtimeQuerySchema.safeParse(req.query)

		if (!query.success) {
			socket.close()
			return
		}

		let decoded: JWTPayload
		try {
			decoded = app.jwt.verify(query.data.token) as JWTPayload
		} catch {
			socket.close()
			return
		}

		const client = {
			socket,
			userId: decoded.id,
			role: decoded.role,
			subscriptions: new Set<string>(),
		}

		const unregister = realtimeService.register(client)

		socket.send(JSON.stringify({
			type: 'connection.ready',
			data: {
				userId: decoded.id,
				role: decoded.role,
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

		socket.on('close', unregister)
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
