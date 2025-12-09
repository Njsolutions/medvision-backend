import { UtiRepository } from '@/repositories/uti.repository'
import { CreateUtiSchema, UpdateUtiSchema, UtiIdSchema } from '@/schemas/uti.schema'
import { auditService } from '@/services/audit.service'
import type { FastifyReply, FastifyRequest } from 'fastify'

export class UtiController {
	private utiRepository: UtiRepository

	constructor() {
		this.utiRepository = new UtiRepository()
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to create UTI' })
			}

			const data = CreateUtiSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			if (data.data.patientId) {
				const patientExists = await this.utiRepository.checkPatientExists(data.data.patientId)

				if (!patientExists) {
					return res.status(404).send({ error: 'Patient not found' })
				}

				const patientHasUti = await this.utiRepository.checkPatientHasUti(data.data.patientId)

				if (patientHasUti) {
					return res.status(409).send({ error: 'Patient already has an UTI assigned' })
				}
			}

			const uti = await this.utiRepository.create(data.data)

			// Registra a criação da UTI no log de auditoria
			if (req.user?.id && req.auditContext) {
				if (data.data.patientId) {
					// Se tem paciente, é uma admissão
					await auditService.logUtiAdmission(
						req.user.id,
						data.data.patientId,
						uti.id,
						req.auditContext
					)
				}
			}

			return res.status(201).send({
				message: 'UTI created successfully',
				data: uti,
			})
		} catch (error) {
			console.error('Error creating UTI:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to update UTI' })
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
				return res.status(404).send({ error: 'UTI not found' })
			}

			if (data.data.patientId !== undefined && data.data.patientId !== null) {
				const patientExists = await this.utiRepository.checkPatientExists(data.data.patientId)

				if (!patientExists) {
					return res.status(404).send({ error: 'Patient not found' })
				}

				if (data.data.patientId !== existingUti.patientId) {
					const patientHasUti = await this.utiRepository.checkPatientHasUti(data.data.patientId)

					if (patientHasUti) {
						return res.status(409).send({ error: 'Patient already has an UTI assigned' })
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
				message: 'UTI updated successfully',
				data: updatedUti,
			})
		} catch (error) {
			console.error('Error updating UTI:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
