import { RequestRepository } from '@/repositories/request.repository'
import { PatientRepository } from '@/repositories/patient.repository'
import { DoctorRepository } from '@/repositories/doctor.repository'
import { 
	CreateRequestsSchema, 
	UpdateRequestSchema, 
	RequestIdSchema, 
	ListRequestsSchema 
} from '@/schemas/request.schema'
import { auditService } from '@/services/audit.service'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

export class RequestController {
	private requestRepository: RequestRepository
	private patientRepository: PatientRepository
	private doctorRepository: DoctorRepository

	constructor(_fastify: FastifyInstance) {
		this.requestRepository = new RequestRepository()
		this.patientRepository = new PatientRepository()
		this.doctorRepository = new DoctorRepository()
	}

	/**
	 * Cria múltiplas solicitações
	 */
	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			const data = CreateRequestsSchema.parse(req.body)
			const userId = req.user?.id

			if (!userId) {
				return res.status(401).send({
					success: false,
					message: 'Usuário não autenticado',
				})
			}

			// Valida se o paciente existe
			const patient = await this.patientRepository.findById(data.patientId)
			if (!patient) {
				return res.status(404).send({
					success: false,
					message: 'Paciente não encontrado',
				})
			}

			// Valida se o médico existe
			const doctor = await this.doctorRepository.findById(data.doctorId)
			if (!doctor) {
				return res.status(404).send({
					success: false,
					message: 'Médico não encontrado',
				})
			}

			// Cria as solicitações
			const requests = await this.requestRepository.createMany(data)

			// Registra auditoria
			await auditService.log({
				userId,
				action: 'CREATE_REQUESTS',
				description: `Criou ${requests.length} solicitação(ões) para o paciente ${patient.user.name}`,
				content: {
					requestIds: requests.map((r) => r.id),
					patientId: data.patientId,
					doctorId: data.doctorId,
					count: requests.length,
				},
				impactLevel: 'medium',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			return res.status(201).send({
				success: true,
				message: `${requests.length} solicitação(ões) criada(s) com sucesso`,
				data: requests,
			})
		} catch (error: any) {
			if (error.name === 'ZodError') {
				return res.status(400).send({
					success: false,
					message: 'Dados de entrada inválidos',
					errors: error.errors,
				})
			}

			console.error('Erro ao criar solicitações:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao criar solicitações',
				error: error.message,
			})
		}
	}

	/**
	 * Lista solicitações com filtros
	 */
	async list(req: FastifyRequest, res: FastifyReply) {
		try {
			const filters = ListRequestsSchema.parse(req.query)
			const result = await this.requestRepository.findMany(filters)

			return res.status(200).send({
				success: true,
				message: 'Solicitações listadas com sucesso',
				data: result,
			})
		} catch (error: any) {
			if (error.name === 'ZodError') {
				return res.status(400).send({
					success: false,
					message: 'Parâmetros de busca inválidos',
					errors: error.errors,
				})
			}

			console.error('Erro ao listar solicitações:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao listar solicitações',
				error: error.message,
			})
		}
	}

	/**
	 * Busca uma solicitação por ID
	 */
	async findById(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = RequestIdSchema.parse(req.params)
			const request = await this.requestRepository.findById(id)

			if (!request) {
				return res.status(404).send({
					success: false,
					message: 'Solicitação não encontrada',
				})
			}

			return res.status(200).send({
				success: true,
				message: 'Solicitação encontrada',
				data: request,
			})
		} catch (error: any) {
			if (error.name === 'ZodError') {
				return res.status(400).send({
					success: false,
					message: 'ID inválido',
					errors: error.errors,
				})
			}

			console.error('Erro ao buscar solicitação:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao buscar solicitação',
				error: error.message,
			})
		}
	}

	/**
	 * Atualiza uma solicitação
	 */
	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = RequestIdSchema.parse(req.params)
			const data = UpdateRequestSchema.parse(req.body)
			const userId = req.user?.id

			if (!userId) {
				return res.status(401).send({
					success: false,
					message: 'Usuário não autenticado',
				})
			}

			const existingRequest = await this.requestRepository.findById(id)
			if (!existingRequest) {
				return res.status(404).send({
					success: false,
					message: 'Solicitação não encontrada',
				})
			}

			const updatedRequest = await this.requestRepository.update(id, data)

			// Registra auditoria
			await auditService.log({
				userId,
				action: 'UPDATE_REQUEST',
				description: `Atualizou a solicitação ${id}`,
				content: {
					requestId: id,
					changes: data,
					previousStatus: existingRequest.status,
					newStatus: data.status,
				},
				impactLevel: 'medium',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			return res.status(200).send({
				success: true,
				message: 'Solicitação atualizada com sucesso',
				data: updatedRequest,
			})
		} catch (error: any) {
			if (error.name === 'ZodError') {
				return res.status(400).send({
					success: false,
					message: 'Dados de entrada inválidos',
					errors: error.errors,
				})
			}

			console.error('Erro ao atualizar solicitação:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao atualizar solicitação',
				error: error.message,
			})
		}
	}

	/**
	 * Deleta uma solicitação
	 */
	async delete(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = RequestIdSchema.parse(req.params)
			const userId = req.user?.id

			if (!userId) {
				return res.status(401).send({
					success: false,
					message: 'Usuário não autenticado',
				})
			}

			const existingRequest = await this.requestRepository.findById(id)
			if (!existingRequest) {
				return res.status(404).send({
					success: false,
					message: 'Solicitação não encontrada',
				})
			}

			await this.requestRepository.delete(id)

			// Registra auditoria
			await auditService.log({
				userId,
				action: 'DELETE_REQUEST',
				description: `Deletou a solicitação ${id}`,
				content: {
					requestId: id,
					deletedRequest: existingRequest,
				},
				impactLevel: 'high',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			return res.status(200).send({
				success: true,
				message: 'Solicitação deletada com sucesso',
			})
		} catch (error: any) {
			if (error.name === 'ZodError') {
				return res.status(400).send({
					success: false,
					message: 'ID inválido',
					errors: error.errors,
				})
			}

			console.error('Erro ao deletar solicitação:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao deletar solicitação',
				error: error.message,
			})
		}
	}

	/**
	 * Busca solicitações de um paciente específico
	 */
	async findByPatientId(req: FastifyRequest, res: FastifyReply) {
		try {
			const { patientId } = req.params as { patientId: string }

			const requests = await this.requestRepository.findByPatientId(patientId)

			return res.status(200).send({
				success: true,
				message: 'Solicitações do paciente listadas com sucesso',
				data: requests,
			})
		} catch (error: any) {
			console.error('Erro ao buscar solicitações do paciente:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao buscar solicitações do paciente',
				error: error.message,
			})
		}
	}

	/**
	 * Busca solicitações de um médico específico
	 */
	async findByDoctorId(req: FastifyRequest, res: FastifyReply) {
		try {
			const { doctorId } = req.params as { doctorId: string }

			const requests = await this.requestRepository.findByDoctorId(doctorId)

			return res.status(200).send({
				success: true,
				message: 'Solicitações do médico listadas com sucesso',
				data: requests,
			})
		} catch (error: any) {
			console.error('Erro ao buscar solicitações do médico:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao buscar solicitações do médico',
				error: error.message,
			})
		}
	}
}
