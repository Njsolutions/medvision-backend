import { TriagemRepository } from '@/modules/triagem/triagem.repository'
import {
	CreateTriagemSchema,
	UpdateTriagemSchema,
	TriagemIdSchema,
	PatientIdSchema,
} from '@/modules/triagem/triagem.schema'
import { auditService } from '@/services/audit.service'
import { ImpactLevel } from '@/types/audit.types'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export class TriagemController {
	private triagemRepository: TriagemRepository

	constructor(_fastify: FastifyInstance) {
		this.triagemRepository = new TriagemRepository()
	}

	async getAll(_req: FastifyRequest, res: FastifyReply) {
		try {
			const triagens = await this.triagemRepository.findAll()

			return res.status(200).send({
				message: 'Triagens retrieved successfully',
				data: triagens,
			})
		} catch (error) {
			console.error('Error retrieving triagens:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getById(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = TriagemIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid triagem ID', details: params.error })
			}

			const triagem = await this.triagemRepository.findById(params.data.id)

			if (!triagem) {
				return res.status(404).send({ error: 'Triagem not found' })
			}

			return res.status(200).send({
				message: 'Triagem retrieved successfully',
				data: triagem,
			})
		} catch (error) {
			console.error('Error retrieving triagem:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getByPatientId(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = PatientIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid patient ID', details: params.error })
			}

			const triagens = await this.triagemRepository.findByPatientId(params.data.patientId)

			return res.status(200).send({
				message: 'Triagens retrieved successfully',
				data: triagens,
			})
		} catch (error) {
			console.error('Error retrieving triagens by patient:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			const data = CreateTriagemSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			// Verifica se o usuário está autenticado
			if (!req.user?.id) {
				return res.status(401).send({ error: 'User not authenticated' })
			}

			// Se houver appointmentId, verifica se já existe triagem para essa consulta
			if (data.data.appointmentId) {
				const existingTriagem = await this.triagemRepository.findByAppointmentId(
					data.data.appointmentId
				)

				if (existingTriagem) {
					return res.status(409).send({
						error: 'Appointment already has a triagem',
						message: 'Já existe uma triagem cadastrada para esta consulta',
					})
				}
			}

			// Cria a triagem associando ao usuário logado
			const triagem = await this.triagemRepository.create({
				...data.data,
				userId: req.user.id,
			})

			// Registra a criação da triagem no log de auditoria
			if (req.auditContext) {
				const patientName = triagem.patient?.user?.name || 'paciente desconhecido'
				await auditService.log({
					userId: req.user.id,
					action: 'CREATE_TRIAGEM',
					description: `Triagem criada para o paciente ${patientName}`,
					content: data.data,
					impactLevel: ImpactLevel.MEDIUM,
					ipAddress: req.auditContext.ipAddress,
					userAgent: req.auditContext.userAgent,
				})
			}

			return res.status(201).send({
				message: 'Triagem created successfully',
				data: triagem,
			})
		} catch (error) {
			console.error('Error creating triagem:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = TriagemIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid triagem ID', details: params.error })
			}

			const data = UpdateTriagemSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingTriagem = await this.triagemRepository.findById(params.data.id)

			if (!existingTriagem) {
				return res.status(404).send({ error: 'Triagem not found' })
			}

			const updatedTriagem = await this.triagemRepository.update(params.data.id, data.data)

			// Registra a atualização da triagem no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.log({
					userId: req.user.id,
					action: 'UPDATE_TRIAGEM',
					description: `Triagem atualizada para o paciente ${updatedTriagem.patient.user.name}`,
					content: data.data,
					impactLevel: ImpactLevel.MEDIUM,
					ipAddress: req.auditContext.ipAddress,
					userAgent: req.auditContext.userAgent,
				})
			}

			return res.status(200).send({
				message: 'Triagem updated successfully',
				data: updatedTriagem,
			})
		} catch (error) {
			console.error('Error updating triagem:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async delete(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = TriagemIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid triagem ID', details: params.error })
			}

			const existingTriagem = await this.triagemRepository.findById(params.data.id)

			if (!existingTriagem) {
				return res.status(404).send({ error: 'Triagem not found' })
			}

			await this.triagemRepository.delete(params.data.id)

			// Registra a exclusão da triagem no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.log({
					userId: req.user.id,
					action: 'DELETE_TRIAGEM',
					description: `Triagem excluída para o paciente ${existingTriagem.patient.user.name}`,
					content: { triagemId: params.data.id },
					impactLevel: ImpactLevel.HIGH,
					ipAddress: req.auditContext.ipAddress,
					userAgent: req.auditContext.userAgent,
				})
			}

			return res.status(200).send({
				message: 'Triagem deleted successfully',
			})
		} catch (error) {
			console.error('Error deleting triagem:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
