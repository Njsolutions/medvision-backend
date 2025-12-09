import { PatientRepository } from '@/repositories/patient.repository'
import { CreatePatientSchema, UpdatePatientSchema, PatientIdSchema } from '@/schemas/patient.schema'
import { CryptoService } from '@/services/crypto.service'
import { auditService } from '@/services/audit.service'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export class PatientController {
	private patientRepository: PatientRepository
	private cryptoService: CryptoService

	constructor(_fastify: FastifyInstance) {
		this.patientRepository = new PatientRepository()
		this.cryptoService = new CryptoService()
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			/* if (req.user !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to create patient' })
			} */

			const data = CreatePatientSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const cpfExists = await this.patientRepository.checkCpfExists(data.data.cpf)

			if (cpfExists) {
				return res.status(409).send({ error: 'CPF already registered' })
			}

			const emailExists = await this.patientRepository.checkEmailExists(data.data.email)

			if (emailExists) {
				return res.status(409).send({ error: 'Email already registered' })
			}

			const generatedPassword = this.cryptoService.generateRandomCode(8)
			const hashedPassword = await this.cryptoService.hashPassword(generatedPassword)

			const patient = await this.patientRepository.create({
				...data.data,
				password: hashedPassword,
			})

			// Registra a criação do paciente no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logUserCreate(
					req.user.id,
					patient.id,
					'patient',
					req.auditContext
				)
			}

			return res.status(201).send({
				message: 'Patient created successfully',
				data: {
					patient,
					temporaryPassword: generatedPassword,
				},
			})
		} catch (error) {
			console.error('Error creating patient:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			/* if (req.user !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to update patient' })
			} */

			const params = PatientIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid patient ID', details: params.error })
			}

			const data = UpdatePatientSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingPatient = await this.patientRepository.findById(params.data.id)

			if (!existingPatient) {
				return res.status(404).send({ error: 'Patient not found' })
			}

			if (data.data.email && data.data.email !== existingPatient.user.email) {
				const emailExists = await this.patientRepository.checkEmailExists(data.data.email)

				if (emailExists) {
					return res.status(409).send({ error: 'Email already registered' })
				}
			}

			const updatedPatient = await this.patientRepository.update(params.data.id, data.data)

			// Registra a atualização do paciente no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logUserUpdate(
					req.user.id,
					params.data.id,
					data.data,
					req.auditContext
				)
			}

			return res.status(200).send({
				message: 'Patient updated successfully',
				data: updatedPatient,
			})
		} catch (error) {
			console.error('Error updating patient:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}