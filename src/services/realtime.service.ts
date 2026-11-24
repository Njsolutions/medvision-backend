type RealtimeClient = {
	socket: {
		readyState: number
		send: (payload: string) => void
		close: () => void
	}
	userId: string
	sessionId?: string
	role?: string
	// Vínculos carregados do banco na conexão. Definem quem pode receber cada evento.
	patientId?: string | null
	doctorId?: string | null
	utiAccess?: boolean
	// Filtro escolhido pelo cliente. Reduz tráfego, NÃO é controle de acesso.
	subscriptions?: Set<string>
}

type RealtimeEvent = {
	type: string
	data?: unknown
}

/**
 * Quem pode receber o evento. Master e admin sempre recebem.
 * - patientId: o paciente dono do dado
 * - doctorIds: médicos envolvidos
 * - utiAccess: médicos com acesso à UTI
 */
export type RealtimeAudience = {
	patientId?: string | null
	doctorIds?: ReadonlyArray<string | null | undefined>
	utiAccess?: boolean
}

const OPEN_STATE = 1

export function matchesAudience(client: RealtimeClient, audience: RealtimeAudience) {
	if (client.role === 'master' || client.role === 'admin') return true

	if (client.role === 'patient') {
		return Boolean(client.patientId) && client.patientId === audience.patientId
	}

	if (client.role === 'doctor') {
		if (client.doctorId && audience.doctorIds?.includes(client.doctorId)) return true
		return Boolean(audience.utiAccess && client.utiAccess)
	}

	return false
}

class RealtimeService {
	private clients = new Set<RealtimeClient>()

	register(client: RealtimeClient) {
		this.clients.add(client)

		return () => {
			this.clients.delete(client)
		}
	}

	/**
	 * Envia o evento só aos clientes da audiência. Não existe envio para todos:
	 * os eventos carregam IDs de paciente/médico e não podem vazar entre usuários.
	 */
	publish(event: RealtimeEvent, audience: RealtimeAudience) {
		const payload = JSON.stringify({
			...event,
			sentAt: new Date().toISOString(),
		})

		for (const client of this.clients) {
			if (!matchesAudience(client, audience)) continue
			if (!this.shouldReceiveEvent(client, event.type)) continue

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
			if (!this.shouldReceiveEvent(client, event.type)) continue

			if (client.socket.readyState === OPEN_STATE) {
				client.socket.send(payload)
			} else {
				this.clients.delete(client)
			}
		}
	}

	/** Fecha os sockets de uma sessão revogada (logout, reuso de refresh). */
	closeBySession(sessionId: string) {
		for (const client of this.clients) {
			if (client.sessionId !== sessionId) continue
			client.socket.close()
			this.clients.delete(client)
		}
	}

	/** Fecha todos os sockets do usuário (troca/reset de senha, desativação). */
	closeByUser(userId: string) {
		for (const client of this.clients) {
			if (client.userId !== userId) continue
			client.socket.close()
			this.clients.delete(client)
		}
	}

	getConnectedClientsCount() {
		return this.clients.size
	}

	private shouldReceiveEvent(client: RealtimeClient, eventType: string) {
		return !client.subscriptions?.size || client.subscriptions.has(eventType)
	}
}

export const realtimeService = new RealtimeService()
