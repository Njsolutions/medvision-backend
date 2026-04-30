export interface DailyService {
	createRoom(
		roomName: string,
		appointmentId: string,
	): Promise<{
		url: string
		roomName: string
	}>
	deleteRoom(roomName: string): Promise<void>
	getRoom(roomName: string): Promise<any>
	generateToken(
		roomName: string,
		userId: string,
		userRole: 'admin' | 'doctor' | 'patient',
		options?: {
			userName?: string
			expiresIn?: number
		},
	): Promise<string>
}

export class DailyApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
		public readonly responseBody?: string,
	) {
		super(message)
		this.name = 'DailyApiError'
	}
}

export function createDailyService(): DailyService {
	const apiKey = process.env.DAILY_CO_API_KEY
	if (!apiKey) {
		throw new Error('DAILY_CO_API_KEY não configurada')
	}

	const baseUrl = 'https://api.daily.co/v1'

	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${apiKey}`,
	}

	const telemedicineRoomProperties = {
		enable_chat: true,
		enable_knocking: false,
		enable_screenshare: false,
		enable_people_ui: false,
		enable_network_ui: true,
		enable_noise_cancellation_ui: true,
		enable_prejoin_ui: true,
		enable_video_processing_ui: true,
		enforce_unique_user_ids: true,
		eject_at_room_exp: false,
		max_participants: 4,
		start_video_off: false,
		start_audio_off: false,
	}

	async function createRoom(roomName: string, appointmentId: string) {
		try {
			const response = await fetch(`${baseUrl}/rooms`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					name: roomName,
					privacy: 'private',
					properties: telemedicineRoomProperties,
					// Não definir 'exp' para que a sala seja permanente
				}),
			})

			const responseText = await response.text()

			if (!response.ok) {
				console.error('Erro ao criar sala Daily:', responseText)
				throw new DailyApiError(
					`Erro ao criar sala Daily: ${response.status} ${response.statusText}`,
					response.status,
					responseText,
				)
			}

			const room = JSON.parse(responseText)

			await new Promise((resolve) => setTimeout(resolve, 500))

			return {
				url: room.url,
				roomName: room.name,
			}
		} catch (error) {
			console.error('❌ Erro ao criar sala:', error)
			if (error instanceof DailyApiError) {
				throw error
			}
			throw new DailyApiError(`Falha ao criar sala Daily: ${error}`)
		}
	}

	async function deleteRoom(roomName: string) {
		try {
			const response = await fetch(`${baseUrl}/rooms/${roomName}`, {
				method: 'DELETE',
				headers,
			})

			if (!response.ok) {
				throw new Error(`Erro ao deletar sala: ${response.statusText}`)
			}
		} catch (error) {
			throw new Error(`Falha ao deletar sala Daily: ${error}`)
		}
	}

	async function getRoom(roomName: string) {
		try {
			const response = await fetch(`${baseUrl}/rooms/${roomName}`, {
				method: 'GET',
				headers,
			})

			if (!response.ok) {
				throw new Error(`Erro ao buscar sala: ${response.statusText}`)
			}

			return await response.json()
		} catch (error) {
			throw new Error(`Falha ao buscar sala Daily: ${error}`)
		}
	}

	async function generateToken(
		roomName: string,
		userId: string,
		userRole: 'admin' | 'doctor' | 'patient',
		options?: {
			userName?: string
			expiresIn?: number
		},
	) {
		try {
			// Apenas médicos e admins são proprietários
			const isOwner = userRole === 'doctor' || userRole === 'admin'

			console.log('Gerando token com dados:', {
				roomName,
				userId: String(userId),
				user_name: options?.userName || 'Usuário',
				isOwner,
				expiresIn: options?.expiresIn || 3600,
			})

			const tokenProperties: Record<string, unknown> = {
				room_name: roomName,
				user_name: options?.userName || 'Usuário',
				user_id: String(userId),
				exp: Math.floor(Date.now() / 1000) + (options?.expiresIn || 3600),
				is_owner: isOwner,
				enable_recording_ui: false,
				enable_screenshare: false,
				lang: 'pt-BR',
				start_cloud_recording: false,
				start_video_off: false,
				start_audio_off: false,
				permissions: {
					canAdmin: isOwner ? ['participants'] : false,
					canSend: ['video', 'audio'],
				},
			}

			// Adiciona permissões válidas para tokens
			if (isOwner) {
				tokenProperties.enable_screenshare = false
				tokenProperties.start_video_off = false
				tokenProperties.start_audio_off = false
			}

			const response = await fetch(`${baseUrl}/meeting-tokens`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					properties: tokenProperties,
				}),
			})

			const responseText = await response.text()
			console.log('Resposta Daily.co:', response.status, responseText)

			if (!response.ok) {
				console.error('Erro ao gerar token Daily:', responseText)
				throw new Error(`Erro ao gerar token: ${response.statusText} - ${responseText}`)
			}

			const data = JSON.parse(responseText)
			if (!data.token) {
				console.error('Token não encontrado na resposta:', data)
				throw new Error(`Token não retornado pela API Daily: ${JSON.stringify(data)}`)
			}

			console.log('Token gerado com sucesso')
			return data.token
		} catch (error) {
			console.error('Falha ao gerar token Daily:', error)
			throw new Error(`Falha ao gerar token Daily: ${error}`)
		}
	}

	return {
		createRoom,
		deleteRoom,
		getRoom,
		generateToken,
	}
}
