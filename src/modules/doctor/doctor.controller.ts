import { DoctorRepository } from '@/modules/doctor/doctor.repository'
import { CreateDoctorSchema, UpdateDoctorSchema, DoctorIdSchema } from '@/modules/doctor/doctor.schema'
import { CryptoService } from '@/services/crypto.service'
import { auditService } from '@/services/audit.service'
import { sendFirstAccess } from '@/services/first-access.service'
import type { FastifyReply, FastifyRequest } from 'fastify'

export class DoctorController {
	private doctorRepository: DoctorRepository
	private cryptoService: CryptoService

	constructor() {
		this.doctorRepository = new DoctorRepository()
		this.cryptoService = new CryptoService()
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to create doctor' })
			}

			const data = CreateDoctorSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const cpfExists = await this.doctorRepository.checkCpfExists(data.data.cpf)

			if (cpfExists) {
				return res.status(409).send({ error: 'CPF already registered' })
			}

			const emailExists = await this.doctorRepository.checkEmailExists(data.data.email)

			if (emailExists) {
				return res.status(409).send({ error: 'Email already registered' })
			}

			const crmExists = await this.doctorRepository.checkCrmExists(data.data.crm)

			if (crmExists) {
				return res.status(409).send({ error: 'CRM already registered' })
			}

			// Ninguém conhece esta senha: o médico define a própria pelo link enviado por e-mail.
			const hashedPassword = await this.cryptoService.hashUnusablePassword()

			const doctor = await this.doctorRepository.create({
				...data.data,
				password: hashedPassword,
			})

			// Registra a criação do médico no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logUserCreate(
					req.user.id,
					doctor.id,
					'doctor',
					req.auditContext
				)
			}

			// E-mail de boas-vindas com link de uso único para definir a senha (sem senha em texto puro).
			const firstAccessEmailSent = await sendFirstAccess(doctor.user, 'doctor')

			return res.status(201).send({
				message: 'Doctor created successfully',
				data: {
					doctor,
					firstAccessEmailSent,
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error creating doctor')
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to update doctor' })
			}

			const params = DoctorIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid doctor ID', details: params.error })
			}

			const data = UpdateDoctorSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingDoctor = await this.doctorRepository.findById(params.data.id)

			if (!existingDoctor) {
				return res.status(404).send({ error: 'Doctor not found' })
			}

			if (data.data.email && data.data.email !== existingDoctor.user.email) {
				const emailExists = await this.doctorRepository.checkEmailExists(data.data.email)

				if (emailExists) {
					return res.status(409).send({ error: 'Email already registered' })
				}
			}

			if (data.data.crm && data.data.crm !== existingDoctor.crm) {
				const crmExists = await this.doctorRepository.checkCrmExists(data.data.crm)

				if (crmExists) {
					return res.status(409).send({ error: 'CRM already registered' })
				}
			}

			const updatedDoctor = await this.doctorRepository.update(params.data.id, data.data)

			// Registra a atualização do médico no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logUserUpdate(
					req.user.id,
					params.data.id,
					data.data,
					req.auditContext
				)
			}

			return res.status(200).send({
				message: 'Doctor updated successfully',
				data: updatedDoctor,
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error updating doctor')
				return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getAll(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to list doctors' })
			}

			const { page, limit } = req.query as { page?: string; limit?: string }
			
			const result = await this.doctorRepository.findAll({
				page: page ? parseInt(page) : undefined,
				limit: limit ? parseInt(limit) : undefined,
			})

			return res.status(200).send({
				message: 'Doctors retrieved successfully',
				data: result.doctors,
				pagination: result.pagination,
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error listing doctors')
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async getById(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to view doctor' })
			}

			const params = DoctorIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid doctor ID', details: params.error })
			}

			const doctor = await this.doctorRepository.findById(params.data.id)

			if (!doctor) {
				return res.status(404).send({ error: 'Doctor not found' })
			}

			return res.status(200).send({
				message: 'Doctor retrieved successfully',
				data: doctor,
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error fetching doctor')
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
