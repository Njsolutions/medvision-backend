type RealtimeClient = {
	socket: {
		readyState: number
		send: (payload: string) => void
		close: () => void
	}
	userId: string
	role?: string
}

type RealtimeEvent = {
	type: string
	data?: unknown
}

const OPEN_STATE = 1

class RealtimeService {
	private clients = new Set<RealtimeClient>()

	register(client: RealtimeClient) {
		this.clients.add(client)

		return () => {
			this.clients.delete(client)
		}
	}

	broadcast(event: RealtimeEvent) {
		const payload = JSON.stringify({
			...event,
			sentAt: new Date().toISOString(),
		})

		for (const client of this.clients) {
			if (client.socket.readyState === OPEN_STATE) {
				client.socket.send(payload)
			} else {
				this.clients.delete(client)
			}
		}
	}

	notifyUser(userId: string, event: RealtimeEvent) {
		const payload = JSON.stringify({
			...event,
			sentAt: new Date().toISOString(),
		})

		for (const client of this.clients) {
			if (client.userId !== userId) continue

			if (client.socket.readyState === OPEN_STATE) {
				client.socket.send(payload)
			} else {
				this.clients.delete(client)
			}
		}
	}

	getConnectedClientsCount() {
		return this.clients.size
	}
}

export const realtimeService = new RealtimeService()
