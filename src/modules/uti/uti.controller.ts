import { UtiRepository } from '@/modules/uti/uti.repository'
import { CreateUtiSchema, UpdateUtiSchema, UtiIdSchema, UtiVisitorInviteSchema } from '@/modules/uti/uti.schema'
import { auditService } from '@/services/audit.service'
import { createDailyService } from '@/services/daily.service'
import { realtimeService } from '@/services/realtime.service'
import { canAccessUti, canManageUtiBed } from '@/utils/security/access-control'
import type { FastifyReply, FastifyRequest } from 'fastify'

export class UtiController {
	private utiRepository: UtiRepository
	private dailyService: ReturnType<typeof createDailyService>

	constructor() {
		this.utiRepository = new UtiRepository()
		this.dailyService = createDailyService()
	}

	async createEmpty(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!(await canManageUtiBed(req.user))) {
				return res.status(403).send({
					error: 'Permissão insuficiente para criar leito de UTI',
					message: 'Apenas usuários autorizados podem adicionar novos leitos de UTI',
				})
			}

			// Primeiro cria o leito para obter o ID
			const uti = await this.utiRepository.create({
				patientId: null,
				status: 'available',
				roomLink: null,
			})

			// Gera sala fixa do Daily.co para este leito
			try {
				const roomName = `uti-bed-${uti.id}`
				const room = await this.dailyService.createRoom(roomName, uti.id)

				// Atualiza o leito com o link da sala e o roomName
				const updatedUti = await this.utiRepository.update(uti.id, {
					roomLink: room.url,
					roomName: roomName,
				})

				this.broadcastUtiEvent('uti.created', updatedUti)

				return res.status(201).send({
					message: 'Empty UTI bed created successfully with video room',
					data: updatedUti,
				})
			} catch (dailyError) {
				console.error('Error creating Daily.co room for UTI bed:', dailyError)
				this.broadcastUtiEvent('uti.created', uti)
				// Retorna o leito mesmo sem a sala, mas alerta o erro
				return res.status(201).send({
					message: 'UTI bed created but failed to create video room',
					data: uti,
					warning: 'Video room creation failed',
				})
			}
		} catch (error) {
			console.error('Error creating empty UTI bed:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!(await canManageUtiBed(req.user))) {
				return res.status(403).send({
					error: 'Permissão insuficiente para criar leito de UTI',
					message: 'Apenas usuários autorizados podem adicionar novos leitos de UTI',
				})
			}

			const data = CreateUtiSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			// Validação apenas se houver paciente
			if (data.data.patientId) {
				const patientExists = await this.utiRepository.checkPatientExists(data.data.patientId)

				if (!patientExists) {
					return res.status(404).send({ error: 'Paciente não encontrado' })
				}

				const patientHasUti = await this.utiRepository.checkPatientHasUti(data.data.patientId)

				if (patientHasUti) {
					return res.status(409).send({
						error: 'Paciente já possui um leito de UTI associado',
						message: 'Paciente já possui um leito de UTI associado',
					})
				}
			}

			// Primeiro cria o leito para obter o ID
			const uti = await this.utiRepository.create({
				...data.data,
				roomLink: null, // Será definido após criar a sala
			})

			// Gera sala fixa do Daily.co para este leito
			let finalUti = uti
			try {
				const roomName = `uti-bed-${uti.id}`
				const room = await this.dailyService.createRoom(roomName, uti.id)

				// Atualiza o leito com o link da sala e o roomName
				finalUti = await this.utiRepository.update(uti.id, {
					roomLink: room.url,
					roomName: roomName,
				})
			} catch (dailyError) {
				console.error('Error creating Daily.co room for UTI bed:', dailyError)
				// Continua sem a sala em caso de erro
			}

			// Registra a criação do leito no log de auditoria
			if (req.user?.id && req.auditContext) {
				if (data.data.patientId) {
					// Se tem paciente, é uma admissão
					await auditService.logUtiAdmission(req.user.id, data.data.patientId, finalUti.id, req.auditContext)
				}
			}

			this.broadcastUtiEvent('uti.created', finalUti)

			return res.status(201).send({
				message: data.data.patientId
					? 'UTI bed created with patient admission and video room'
					: 'UTI bed created successfully with video room',
				data: finalUti,
			})
		} catch (error) {
			console.error('Error creating UTI bed:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async getAll(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!(await canAccessUti(req.user))) {
				return res.status(403).send({ error: 'Permissão insuficiente para visualizar leitos de UTI' })
			}

			const utis = await this.utiRepository.findAll()

			return res.status(200).send({
				message: 'UTI beds retrieved successfully',
				data: utis,
			})
		} catch (error) {
			console.error('Error fetching UTI beds:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async getById(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!(await canAccessUti(req.user))) {
				return res.status(403).send({ error: 'Permissão insuficiente para visualizar leito de UTI' })
			}

			const params = UtiIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'ID do leito de UTI inválido', details: params.error })
			}

			const uti = await this.utiRepository.findById(params.data.id)

			if (!uti) {
				return res.status(404).send({ error: 'Leito de UTI não encontrado' })
			}

			return res.status(200).send({
				message: 'UTI bed retrieved successfully',
				data: uti,
			})
		} catch (error) {
			console.error('Error fetching UTI bed:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!(await canManageUtiBed(req.user))) {
				return res.status(403).send({ error: 'Permissão insuficiente para atualizar leito de UTI' })
			}

			const params = UtiIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'ID do leito de UTI inválido', details: params.error })
			}

			const data = UpdateUtiSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisição inválidos', details: data.error })
			}

			const existingUti = await this.utiRepository.findById(params.data.id)

			if (!existingUti) {
				return res.status(404).send({ error: 'Leito de UTI não encontrado' })
			}

			// Validação apenas se estiver atribuindo um paciente
			if (data.data.patientId !== undefined && data.data.patientId !== null) {
				const patientExists = await this.utiRepository.checkPatientExists(data.data.patientId)

				if (!patientExists) {
					return res.status(404).send({ error: 'Paciente não encontrado' })
				}

				// Verificar se o paciente já não está neste leito
				if (data.data.patientId !== existingUti.patientId) {
					const patientHasUti = await this.utiRepository.checkPatientHasUti(data.data.patientId)

					if (patientHasUti) {
						return res.status(409).send({
							error: 'Paciente já possui um leito de UTI associado',
							message: 'Paciente já possui um leito de UTI associado',
						})
					}
				}
			}

			const updatedUti = await this.utiRepository.update(params.data.id, data.data)

			// Registra a atualização da UTI no log de auditoria
			if (req.user?.id && req.auditContext) {
				// Verificar se é admissão ou alta
				if (data.data.patientId !== undefined) {
					if (data.data.patientId === null && existingUti.patientId) {
						// Alta da UTI
						await auditService.logUtiDischarge(req.user.id, existingUti.patientId, params.data.id, req.auditContext)
					} else if (data.data.patientId && data.data.patientId !== existingUti.patientId) {
						// Admissão na UTI
						await auditService.logUtiAdmission(req.user.id, data.data.patientId, params.data.id, req.auditContext)
					}
				}
			}

			this.broadcastUtiEvent('uti.updated', updatedUti)

			return res.status(200).send({
				message: 'UTI bed updated successfully',
				data: updatedUti,
			})
		} catch (error) {
			console.error('Error updating UTI bed:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async getRoomToken(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!req.user) {
				return res.status(401).send({ error: 'Não autorizado' })
			}

			if (!(await canAccessUti(req.user))) {
				return res.status(403).send({ error: 'Permissão insuficiente para acessar a sala da UTI' })
			}

			const params = UtiIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'ID do leito de UTI inválido', details: params.error })
			}

			let uti = await this.utiRepository.findById(params.data.id)

			if (!uti) {
				return res.status(404).send({ error: 'Leito de UTI não encontrado' })
			}

			if (!uti.roomName || !uti.roomLink) {
				const roomName = uti.roomName || `uti-bed-${uti.id}`

				try {
					const room = await this.dailyService.createRoom(roomName, uti.id)
					uti = await this.utiRepository.update(uti.id, {
						roomLink: room.url,
						roomName: room.roomName,
					})
					console.log(`Sala Daily criada automaticamente para UTI ${uti.id}: ${room.roomName}`)
				} catch (createRoomError) {
					try {
						const existingRoom = await this.dailyService.getRoom(roomName)
						uti = await this.utiRepository.update(uti.id, {
							roomLink: existingRoom.url,
							roomName,
						})
						console.log(`Sala Daily existente sincronizada para UTI ${uti.id}: ${roomName}`)
					} catch (getRoomError) {
						console.error('Error ensuring Daily.co room for UTI bed:', {
							createRoomError,
							getRoomError,
							utiId: uti.id,
							roomName,
						})
						return res.status(500).send({
							error: 'Nao foi possivel criar a sala de video para este leito de UTI',
							details: getRoomError instanceof Error ? getRoomError.message : 'Unknown error',
						})
					}
				}
			}

			if (!uti.roomLink) {
				return res.status(404).send({ error: 'Nenhuma sala de vídeo associada a este leito de UTI' })
			}

			// Se não tiver roomName, gera e atualiza automaticamente
			if (!uti.roomName) {
				const roomName = `uti-bed-${uti.id}`
				uti = await this.utiRepository.update(uti.id, { roomName })
				console.log(`✓ RoomName gerado automaticamente para UTI ${uti.id}: ${roomName}`)
			}

			const ensuredRoomName = uti.roomName || `uti-bed-${uti.id}`
			try {
				const existingRoom = await this.dailyService.getRoom(ensuredRoomName)
				if (uti.roomName !== ensuredRoomName || uti.roomLink !== existingRoom.url) {
					uti = await this.utiRepository.update(uti.id, {
						roomLink: existingRoom.url,
						roomName: ensuredRoomName,
					})
				}
			} catch (getRoomError) {
				try {
					const room = await this.dailyService.createRoom(ensuredRoomName, uti.id)
					uti = await this.utiRepository.update(uti.id, {
						roomLink: room.url,
						roomName: room.roomName,
					})
				} catch (createRoomError) {
					console.error('Error ensuring Daily.co room for UTI bed:', {
						getRoomError,
						createRoomError,
						utiId: uti.id,
						roomName: ensuredRoomName,
					})
					return res.status(500).send({
						error: 'Nao foi possivel criar a sala de video para este leito de UTI',
						details: createRoomError instanceof Error ? createRoomError.message : 'Unknown error',
					})
				}
			}

			// Gera token de acesso
			try {
				// Mapeia 'master' para 'admin' pois Daily.co não reconhece 'master'
				const dailyRole = req.user.role === 'master' ? 'admin' : req.user.role

				console.log('Gerando token para UTI:', {
					utiId: uti.id,
					roomName: uti.roomName,
					roomLink: uti.roomLink,
					userId: req.user.id,
					userRole: req.user.role,
					dailyRole,
					userEmail: req.user.email,
				})

				const token = await this.dailyService.generateToken(
					uti.roomName ?? '',
					req.user.id,
					dailyRole as 'admin' | 'doctor' | 'patient',
					{
						userName: req.user.email || 'Usuário',
						expiresIn: 7200, // 2 horas
					},
				)

				return res.status(200).send({
					message: 'Access token generated successfully',
					data: {
						roomUrl: uti.roomLink,
						token,
						// URL completa com token para acesso direto
						accessUrl: `${uti.roomLink}?t=${token}`,
					},
				})
			} catch (tokenError) {
				console.error('❌ Error generating Daily.co token for UTI:', tokenError)
				console.error('Error details:', {
					message: tokenError instanceof Error ? tokenError.message : 'Unknown error',
					stack: tokenError instanceof Error ? tokenError.stack : undefined,
					utiId: uti.id,
					roomName: uti.roomName,
				})
				return res.status(500).send({
					error: 'Não foi possível gerar o token de acesso',
					details: tokenError instanceof Error ? tokenError.message : 'Unknown error',
				})
			}
		} catch (error) {
			console.error('Error getting room token:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	async inviteVisitor(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!req.user) {
				return res.status(401).send({ error: 'NÃ£o autorizado' })
			}

			if (!(await canManageUtiBed(req.user))) {
				return res.status(403).send({
					error: 'PermissÃ£o insuficiente para iniciar visita de UTI',
					message: 'Apenas administradores autorizados podem enviar links de visita',
				})
			}

			const params = UtiIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'ID do leito de UTI invÃ¡lido', details: params.error })
			}

			const data = UtiVisitorInviteSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Dados da requisiÃ§Ã£o invÃ¡lidos', details: data.error })
			}

			let uti = await this.utiRepository.findById(params.data.id)

			if (!uti) {
				return res.status(404).send({ error: 'Leito de UTI nÃ£o encontrado' })
			}

			if (uti.status !== 'occupied' || !uti.patientId || !uti.patient) {
				return res.status(409).send({
					error: 'Leito sem paciente internado',
					message: 'A visita sÃ³ pode ser iniciada para leitos ocupados',
				})
			}

			uti = await this.ensureRoom(uti)

			if (!uti.roomLink || !uti.roomName) {
				return res.status(500).send({ error: 'Sala de vÃ­deo indisponÃ­vel para este leito de UTI' })
			}

			const restrictedRoom = await this.dailyService.setRoomPrivacy(uti.roomName, 'private')
			const roomUrl = restrictedRoom.url || uti.roomLink
			const visitorToken = await this.dailyService.generateToken(uti.roomName, `visitor-${uti.id}`, 'patient', {
				userName: 'Visitante',
				expiresIn: 7200,
			})
			const tokenSeparator = roomUrl.includes('?') ? '&' : '?'
			const accessUrl = `${roomUrl}${tokenSeparator}t=${encodeURIComponent(visitorToken)}`

			return res.status(200).send({
				message: 'Link de visita gerado',
				data: {
					utiId: uti.id,
					bedNumber: uti.bedNumber,
					accessUrl,
				},
			})
		} catch (error) {
			console.error('Error inviting UTI visitor:', error)
			return res.status(500).send({ error: 'Erro interno do servidor' })
		}
	}

	private async ensureRoom(uti: NonNullable<Awaited<ReturnType<UtiRepository['findById']>>>) {
		if (uti.roomName && uti.roomLink) {
			return uti
		}

		const roomName = uti.roomName || `uti-bed-${uti.id}`
		try {
			const room = await this.dailyService.createRoom(roomName, uti.id)
			return this.utiRepository.update(uti.id, {
				roomLink: room.url,
				roomName: room.roomName,
			})
		} catch (createRoomError) {
			const existingRoom = await this.dailyService.getRoom(roomName)
			return this.utiRepository.update(uti.id, {
				roomLink: existingRoom.url,
				roomName,
			})
		}
	}

	private broadcastUtiEvent(type: 'uti.created' | 'uti.updated', uti: {
		id: string
		patientId: string | null
		status: string
		bedNumber: string
	}) {
		realtimeService.broadcast({
			type,
			data: {
				utiId: uti.id,
				patientId: uti.patientId,
				status: uti.status,
				bedNumber: uti.bedNumber,
			},
		})
	}
}
