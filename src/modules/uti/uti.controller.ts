import { UtiRepository } from '@/modules/uti/uti.repository'
import { CreateUtiSchema, UpdateUtiSchema, UtiIdSchema } from '@/modules/uti/uti.schema'
import { auditService } from '@/services/audit.service'
import { createDailyService } from '@/services/daily.service'
import type { FastifyReply, FastifyRequest } from 'fastify'

export class UtiController {
	private utiRepository: UtiRepository
	private dailyService: ReturnType<typeof createDailyService>

	constructor() {
		this.utiRepository = new UtiRepository()
		this.dailyService = createDailyService()
	}

	private canCreateUtiBed(req: FastifyRequest) {
		if (!req.user || (req.user.role !== 'master' && req.user.role !== 'admin')) {
			return false
		}

		const configuredEmails = (process.env.UTI_BED_CREATOR_EMAILS || '')
			.split(',')
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean)

		if (configuredEmails.length > 0) {
			return configuredEmails.includes(req.user.email.toLowerCase())
		}

		const identity = `${req.user.name} ${req.user.email}`.toLowerCase()
		return identity.includes('natan') || identity.includes('mateus')
	}

	async createEmpty(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!this.canCreateUtiBed(req)) {
				return res.status(403).send({
					error: 'Insufficient permissions to create UTI bed',
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

				return res.status(201).send({
					message: 'Empty UTI bed created successfully with video room',
					data: updatedUti,
				})
			} catch (dailyError) {
				console.error('Error creating Daily.co room for UTI bed:', dailyError)
				// Retorna o leito mesmo sem a sala, mas alerta o erro
				return res.status(201).send({
					message: 'UTI bed created but failed to create video room',
					data: uti,
					warning: 'Video room creation failed',
				})
			}
		} catch (error) {
			console.error('Error creating empty UTI bed:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!this.canCreateUtiBed(req)) {
				return res.status(403).send({
					error: 'Insufficient permissions to create UTI bed',
					message: 'Apenas usuários autorizados podem adicionar novos leitos de UTI',
				})
			}

			const data = CreateUtiSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			// Validação apenas se houver paciente
			if (data.data.patientId) {
				const patientExists = await this.utiRepository.checkPatientExists(data.data.patientId)

				if (!patientExists) {
					return res.status(404).send({ error: 'Patient not found' })
				}

				const patientHasUti = await this.utiRepository.checkPatientHasUti(data.data.patientId)

				if (patientHasUti) {
					return res.status(409).send({ error: 'Patient already has an UTI bed assigned' })
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
					await auditService.logUtiAdmission(
						req.user.id,
						data.data.patientId,
						finalUti.id,
						req.auditContext
					)
				}
			}

			return res.status(201).send({
				message: data.data.patientId ? 'UTI bed created with patient admission and video room' : 'UTI bed created successfully with video room',
				data: finalUti,
			})
		} catch (error) {
			console.error('Error creating UTI bed:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getAll(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user?.role !== 'master' && req.user?.role !== 'admin' && req.user?.role !== 'doctor') {
				return res.status(403).send({ error: 'Insufficient permissions to view UTI beds' })
			}

			const utis = await this.utiRepository.findAll()

			return res.status(200).send({
				message: 'UTI beds retrieved successfully',
				data: utis,
			})
		} catch (error) {
			console.error('Error fetching UTI beds:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getById(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user?.role !== 'master' && req.user?.role !== 'admin' && req.user?.role !== 'doctor') {
				return res.status(403).send({ error: 'Insufficient permissions to view UTI bed' })
			}

			const params = UtiIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid UTI ID', details: params.error })
			}

			const uti = await this.utiRepository.findById(params.data.id)

			if (!uti) {
				return res.status(404).send({ error: 'UTI bed not found' })
			}

			return res.status(200).send({
				message: 'UTI bed retrieved successfully',
				data: uti,
			})
		} catch (error) {
			console.error('Error fetching UTI bed:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user?.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to update UTI bed' })
			}

			const params = UtiIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid UTI ID', details: params.error })
			}

			const data = UpdateUtiSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingUti = await this.utiRepository.findById(params.data.id)

			if (!existingUti) {
				return res.status(404).send({ error: 'UTI bed not found' })
			}

			// Validação apenas se estiver atribuindo um paciente
			if (data.data.patientId !== undefined && data.data.patientId !== null) {
				const patientExists = await this.utiRepository.checkPatientExists(data.data.patientId)

				if (!patientExists) {
					return res.status(404).send({ error: 'Patient not found' })
				}

				// Verificar se o paciente já não está neste leito
				if (data.data.patientId !== existingUti.patientId) {
					const patientHasUti = await this.utiRepository.checkPatientHasUti(data.data.patientId)

					if (patientHasUti) {
						return res.status(409).send({ error: 'Patient already has an UTI bed assigned' })
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
						await auditService.logUtiDischarge(
							req.user.id,
							existingUti.patientId,
							params.data.id,
							req.auditContext
						)
					} else if (data.data.patientId && data.data.patientId !== existingUti.patientId) {
						// Admissão na UTI
						await auditService.logUtiAdmission(
							req.user.id,
							data.data.patientId,
							params.data.id,
							req.auditContext
						)
					}
				}
			}

			return res.status(200).send({
				message: 'UTI bed updated successfully',
				data: updatedUti,
			})
		} catch (error) {
			console.error('Error updating UTI bed:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getRoomToken(req: FastifyRequest, res: FastifyReply) {
		try {
			if (!req.user) {
				return res.status(401).send({ error: 'Unauthorized' })
			}

			const params = UtiIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid UTI ID', details: params.error })
			}

let uti = await this.utiRepository.findById(params.data.id)

		if (!uti) {
			return res.status(404).send({ error: 'UTI bed not found' })
		}

		if (!uti.roomLink) {
			return res.status(404).send({ error: 'No video room associated with this UTI bed' })
		}

		// Se não tiver roomName, gera e atualiza automaticamente
		if (!uti.roomName) {
			const roomName = `uti-bed-${uti.id}`
			uti = await this.utiRepository.update(uti.id, { roomName })
			console.log(`✓ RoomName gerado automaticamente para UTI ${uti.id}: ${roomName}`)
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
					userEmail: req.user.email
				})
				
				const token = await this.dailyService.generateToken(
					uti.roomName ?? '',
					req.user.id,
					dailyRole as 'admin' | 'doctor' | 'patient',
					{
						userName: req.user.email || 'Usuário',
						expiresIn: 7200, // 2 horas
					}
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
					error: 'Failed to generate access token',
					details: tokenError instanceof Error ? tokenError.message : 'Unknown error'
				})
			}
		} catch (error) {
			console.error('Error getting room token:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
