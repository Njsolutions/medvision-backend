import { RequestRepository } from '@/modules/request/request.repository'
import { PatientRepository } from '@/modules/patient/patient.repository'
import { DoctorRepository } from '@/modules/doctor/doctor.repository'
import { 
	CreateRequestsSchema, 
	REQUEST_TYPE_OPTIONS,
	UpdateRequestSchema, 
	RequestIdSchema, 
	ListRequestsSchema 
} from '@/modules/request/request.schema'
import { auditService } from '@/services/audit.service'
import { signatureRepository } from '@/repositories/signature.repository'
import { pdfGeneratorService } from '@/services/pdf-generator.service'
import { signatureService } from '@/services/signature.service'
import { realtimeService } from '@/services/realtime.service'
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
	 * Lista opções de tipos de solicitações
	 */
	async options(_req: FastifyRequest, res: FastifyReply) {
		return res.status(200).send({
			success: true,
			message: 'Opções de solicitações listadas com sucesso',
			data: REQUEST_TYPE_OPTIONS,
		})
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

			// ✅ GERA ASSINATURA ELETRÔNICA AUTOMÁTICA para cada solicitação
			const signaturesData = []

			for (const request of requests) {
				const documentContent = {
					id: request.id,
					patientId: request.patientId,
					doctorId: request.doctorId,
					type: request.type,
					details: request.details,
					createdAt: request.createdAt,
				}

			const documentHash = signatureService.generateDocumentHash(documentContent)

			const signatureData = {
				documentHash,
				signerId: doctor.userId,
				signerName: doctor.user.name,
				signerCRM: doctor.crm,
				timestamp: new Date(),
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
				documentType: 'request' as const,
				documentId: request.id,
			}

			const signatureResult = signatureService.signDocument(signatureData)

			// Salva assinatura no banco
			await signatureRepository.create({
				certificateId: signatureResult.certificateId,
				documentType: 'request',
				documentId: request.id,
				documentHash: signatureResult.documentHash,
				signerId: doctor.userId,
				signerName: doctor.user.name,
				signerCRM: doctor.crm,
				signerRole: 'doctor',
				signature: signatureResult.signature,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
				signedAt: signatureResult.timestamp,
			})

			signaturesData.push({
				requestId: request.id,
				certificateId: signatureResult.certificateId,
				signedAt: signatureResult.timestamp,
			})
		}

		// Registra auditoria
		await auditService.log({
			userId,
			action: 'CREATE_REQUESTS',
			description: `Criou e assinou ${requests.length} solicitação(ões) para o paciente ${patient.user.name}`,
			content: {
				requestIds: requests.map((r) => r.id),
				patientId: data.patientId,
				doctorId: data.doctorId,
				count: requests.length,
				certificates: signaturesData,
			},
			impactLevel: 'medium',
			ipAddress: req.ip,
			userAgent: req.headers['user-agent'],
		})

		realtimeService.broadcast({
			type: 'requests.created',
			data: {
				requestIds: requests.map((request) => request.id),
				patientId: data.patientId,
				doctorId: data.doctorId,
				appointmentId: data.appointmentId,
				count: requests.length,
			},
		})

		return res.status(201).send({
				success: true,
				message: `${requests.length} solicitação(ões) criada(s) e assinada(s) com sucesso`,
				data: requests,
				signatures: signaturesData,
			})
		} catch (error: any) {
			if (error.name === 'ZodError') {
				return res.status(400).send({
					success: false,
					message: 'Dados de entrada inválidos',
					errors: error.issues,
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
					errors: error.issues,
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
					errors: error.issues,
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

			realtimeService.broadcast({
				type: 'request.updated',
				data: {
					requestId: updatedRequest.id,
					patientId: updatedRequest.patientId,
					doctorId: updatedRequest.doctorId,
					status: updatedRequest.status,
					type: updatedRequest.type,
				},
			})

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
					errors: error.issues,
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

			realtimeService.broadcast({
				type: 'request.deleted',
				data: {
					requestId: id,
					patientId: existingRequest.patientId,
					doctorId: existingRequest.doctorId,
					type: existingRequest.type,
				},
			})

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
					errors: error.issues,
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

	/**
	 * Gera PDF da solicitação
	 */
	async generatePDF(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = RequestIdSchema.parse(req.params)

			// Busca solicitação completa
			const request = await this.requestRepository.findById(id)

			if (!request) {
				return res.status(404).send({
					success: false,
					message: 'Solicitação não encontrada',
				})
			}

			// Verifica permissão
			const userId = req.user?.id
			const isDoctor = request.doctorId === req.user?.doctorId
			const isPatient = request.patientId === req.user?.patientId
			const isAdmin = req.user?.role === 'admin' || req.user?.role === 'master'

			if (!isDoctor && !isPatient && !isAdmin) {
				return res.status(403).send({
					success: false,
					message: 'Você não tem permissão para acessar esta solicitação',
				})
			}

			// Busca assinatura
			const signatures = await signatureRepository.findByDocument('request', id)
			const signature = signatures.length > 0 ? signatures[0] : undefined

			console.log(`🔍 Assinaturas encontradas: ${signatures.length}`)
			if (signature) {
				console.log('✅ Assinatura será incluída no PDF')
			} else {
				console.log('⚠️ Nenhuma assinatura encontrada para esta solicitação - PDF será gerado sem assinatura')
			}

			// Gera PDF
			const base64PDF = await pdfGeneratorService.generateRequestPDF(
				request,
				signature ? {
					certificateId: signature.certificateId,
					signedBy: signature.signerName,
					signedAt: signature.signedAt,
					documentHash: signature.documentHash,
				} : undefined
			)

			console.log(`✅ PDF gerado com sucesso, tamanho: ${Buffer.from(base64PDF, 'base64').length}`)

			// Registra acesso no audit log
			try {
				await auditService.log({
					userId: userId!,
					action: 'GENERATE_REQUEST_PDF',
					description: `PDF gerado para solicitação ${id}`,
					content: { requestId: id },
					impactLevel: 'low',
					ipAddress: req.ip,
					userAgent: req.headers['user-agent'],
				})
			} catch (auditError) {
				console.error('⚠️ Erro ao registrar audit log:', auditError)
			}

			return res.status(200).send({
				success: true,
				message: 'PDF gerado com sucesso',
				data: {
					pdf: base64PDF,
					filename: `medvision-solicitacao-${request.patient?.user.name.replace(/\s+/g, '_') ?? request.id}-${new Date().toISOString().split('T')[0]}.pdf`,
					mimeType: 'application/pdf',
					size: Buffer.from(base64PDF, 'base64').length,
				},
			})
		} catch (error: any) {
			console.error('❌ Error generating PDF:', error)
			console.error('Error message:', error?.message)
			console.error('Error stack:', error?.stack)

			return res.status(500).send({
				success: false,
				message: 'Erro ao gerar PDF',
				details: error?.message || 'Erro desconhecido',
			})
		}
	}

	/**
	 * Assina uma solicitação existente
	 */
	async signRequest(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = RequestIdSchema.parse(req.params)
			const userId = req.user?.id

			if (!userId) {
				return res.status(401).send({
					success: false,
					message: 'Usuário não autenticado',
				})
			}

			// Busca solicitação
			const request = await this.requestRepository.findById(id)

			if (!request) {
				return res.status(404).send({
					success: false,
					message: 'Solicitação não encontrada',
				})
			}

			// Verifica se é o médico da solicitação
			if (request.doctorId !== req.user?.doctorId) {
				return res.status(403).send({
					success: false,
					message: 'Apenas o médico responsável pode assinar a solicitação',
				})
			}

			// Verifica se já tem assinatura
			const existingSignatures = await signatureRepository.findByDocument('request', id)
			if (existingSignatures.length > 0) {
				return res.status(400).send({
					success: false,
					message: 'Solicitação já está assinada',
				})
			}

			// Gera assinatura
			const documentContent = {
				id: request.id,
				patientId: request.patientId,
				doctorId: request.doctorId,
				type: request.type,
				details: request.details,
				createdAt: request.createdAt,
			}

			const documentHash = signatureService.generateDocumentHash(JSON.stringify(documentContent))
			const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

			const signatureData = {
				documentType: 'request' as const,
				documentId: request.id,
				documentHash,
				certificateId,
				signerId: request.doctorId,
				signerName: request.doctor?.user.name ?? 'Médico',
				signerCRM: request.doctor?.crm ?? '',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'] || 'Unknown',
			}

			const signature = signatureService.signDocument(signatureData)

			await signatureRepository.create({
				...signatureData,
				signature,
			})

			const certificate = signatureService.generateCertificate({
				certificateId,
				signedBy: signatureData.signerName,
				signedAt: new Date(),
				documentHash: signatureData.documentHash,
			})

			return res.status(201).send({
				success: true,
				message: 'Solicitação assinada com sucesso',
				data: {
					certificateId,
					signedAt: new Date(),
					signedBy: signatureData.signerName,
					documentHash: signature.documentHash,
					certificate,
				},
			})
		} catch (error: any) {
			console.error('Error signing request:', error)
			return res.status(500).send({
				success: false,
				message: 'Erro ao assinar solicitação',
				error: error?.message,
			})
		}
	}
}
