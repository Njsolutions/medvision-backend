import { AdminRepository } from '@/modules/admin/admin.repository'
import { CreateAdminSchema, UpdateAdminSchema, AdminIdSchema } from '@/modules/admin/admin.schema'
import { CryptoService } from '@/services/crypto.service'
import { auditService } from '@/services/audit.service'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export class AdminController {
	private adminRepository: AdminRepository
	private cryptoService: CryptoService

	constructor(_fastify: FastifyInstance) {
		this.adminRepository = new AdminRepository()
		this.cryptoService = new CryptoService()
	}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			/* if (req.user !== 'master') {
				return res.status(403).send({ error: 'Insufficient permissions to create admin' })
			} */

			const data = CreateAdminSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const cpfExists = await this.adminRepository.checkCpfExists(data.data.cpf)

			if (cpfExists) {
				return res.status(409).send({ error: 'CPF already registered' })
			}

			const emailExists = await this.adminRepository.checkEmailExists(data.data.email)

			if (emailExists) {
				return res.status(409).send({ error: 'Email already registered' })
			}

			const generatedPassword = this.cryptoService.generateRandomCode(8)
			const hashedPassword = await this.cryptoService.hashPassword(generatedPassword)

			const admin = await this.adminRepository.create({
				...data.data,
				password: hashedPassword,
			})

			// Registra a criação do admin no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logUserCreate(
					req.user.id,
					admin.id,
					'admin',
					req.auditContext
				)
			}

			return res.status(201).send({
				message: 'Admin created successfully',
				data: {
					admin,
					temporaryPassword: generatedPassword,
				}
			})
		} catch (error) {
			console.error('Error creating admin:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user?.role !== 'master' && req.user?.role !== 'admin') {
				return res.status(403).send({ error: 'Insufficient permissions to update admin' })
			}

			const params = AdminIdSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({ error: 'Invalid admin ID', details: params.error })
			}

			const data = UpdateAdminSchema.safeParse(req.body)

			if (!data.success) {
				return res.status(400).send({ error: 'Invalid request data', details: data.error })
			}

			const existingAdmin = await this.adminRepository.findById(params.data.id)

			if (!existingAdmin) {
				return res.status(404).send({ error: 'Admin not found' })
			}

			if (data.data.email && data.data.email !== existingAdmin.user.email) {
				const emailExists = await this.adminRepository.checkEmailExists(data.data.email)

				if (emailExists) {
					return res.status(409).send({ error: 'Email already registered' })
				}
			}

			const updatedAdmin = await this.adminRepository.update(params.data.id, data.data)

			// Registra a atualização do admin no log de auditoria
			if (req.user?.id && req.auditContext) {
				await auditService.logUserUpdate(
					req.user.id,
					params.data.id,
					data.data,
					req.auditContext
				)
			}

			return res.status(200).send({
				message: 'Admin updated successfully',
				data: updatedAdmin,
			})
		} catch (error) {
			console.error('Error updating admin:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
