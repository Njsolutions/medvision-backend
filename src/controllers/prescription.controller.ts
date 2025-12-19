import type { FastifyReply, FastifyRequest } from 'fastify'
import {
	type CreatePrescriptionInput,
	type ListPrescriptionQuery,
	type PrescriptionParams,
	type UpdatePrescriptionInput,
	createPrescriptionSchema,
	listPrescriptionQuerySchema,
	prescriptionParamsSchema,
	updatePrescriptionSchema,
} from '../schemas/prescription.schema'
import { prescriptionRepository } from '../repositories/prescription.repository'
import { auditService } from '../services/audit.service'

export class PrescriptionController {
	/**
	 * Cria uma nova prescrição
	 */
	async create(
		request: FastifyRequest<{
			Body: CreatePrescriptionInput
		}>,
		reply: FastifyReply,
	) {
		try {
			// Validação dos dados
			const data = createPrescriptionSchema.parse(request.body)

			// Verifica se o paciente existe
			const patientExists =
				await prescriptionRepository.patientExists(data.patientId)
			if (!patientExists) {
				return reply.status(404).send({
					statusCode: 404,
					error: 'Not Found',
					message: 'Paciente não encontrado',
				})
			}

			// Verifica se o médico existe
			const doctorExists =
				await prescriptionRepository.doctorExists(data.doctorId)
			if (!doctorExists) {
				return reply.status(404).send({
					statusCode: 404,
					error: 'Not Found',
					message: 'Médico não encontrado',
				})
			}

			// Verifica se o agendamento existe (se fornecido)
			if (data.appointmentId) {
				const appointmentExists =
					await prescriptionRepository.appointmentExists(data.appointmentId)
				if (!appointmentExists) {
					return reply.status(404).send({
						statusCode: 404,
						error: 'Not Found',
						message: 'Agendamento não encontrado',
					})
				}
			}

			// Cria a prescrição
			const prescription = await prescriptionRepository.create(data)

		// Busca dados completos do médico para a assinatura
		const doctor = await prescriptionRepository.getDoctorWithUser(data.doctorId)
		if (!doctor) {
			return reply.status(404).send({
				statusCode: 404,
				error: 'Not Found',
				message: 'Médico não encontrado',
			})
		}

		// ✅ GERA ASSINATURA ELETRÔNICA AUTOMÁTICA
		const { signatureService } = await import('../services/signature.service')
		const { signatureRepository } = await import('../repositories/signature.repository')

		const documentContent = {
			id: prescription.id,
			patientId: prescription.patientId,
			doctorId: prescription.doctorId,
			medicamentos: prescription.medicamentos,
			orientacoesGerais: prescription.orientacoesGerais,
			createdAt: prescription.createdAt,
		}

		const documentHash = signatureService.generateDocumentHash(documentContent)

		const signatureData = {
			documentHash,
			signerId: doctor.userId,
			signerName: doctor.user.name,
			signerCRM: doctor.crm,
			timestamp: new Date(),
			ipAddress: request.ip,
			userAgent: request.headers['user-agent'],
			documentType: 'prescription' as const,
			documentId: prescription.id,
		}

		const signatureResult = signatureService.signDocument(signatureData)

		// Salva assinatura no banco
		const signature = await signatureRepository.create({
			certificateId: signatureResult.certificateId,
			documentType: 'prescription',
			documentId: prescription.id,
			documentHash: signatureResult.documentHash,
			signerId: doctor.userId,
			signerName: doctor.user.name,
			signerCRM: doctor.crm,
			signerRole: 'doctor',
			signature: signatureResult.signature,
			ipAddress: request.ip,
			userAgent: request.headers['user-agent'],
			signedAt: signatureResult.timestamp,
		})

		// Gera certificado
		const certificate = signatureService.generateCertificate(
			signatureData,
			signatureResult
		)

		// Log de auditoria
		await auditService.logPrescriptionCreated(
			request.user!.id,
			prescription.id,
			{
				patientId: data.patientId,
				doctorId: data.doctorId,
				medicamentosCount: data.medicamentos.length,
				certificateId: signature.certificateId,
			},
			request.ip,
			request.headers['user-agent'],
		)

		return reply.status(201).send({
			statusCode: 201,
			message: 'Prescrição criada e assinada com sucesso',
			data: prescription,
			signature: {
				certificateId: signature.certificateId,
				signedAt: signature.signedAt,
				signedBy: signature.signerName,
				documentHash: signature.documentHash,
				certificate,
			},
		})
		} catch (error) {
			if (error instanceof Error && error.name === 'ZodError') {
				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'Dados inválidos',
					details: error,
				})
			}

			request.log.error(error)
			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'Erro ao criar prescrição',
			})
		}
	}

	/**
	 * Lista prescrições com filtros
	 */
	async list(
		request: FastifyRequest<{
			Querystring: ListPrescriptionQuery
		}>,
		reply: FastifyReply,
	) {
		try {
			const query = listPrescriptionQuerySchema.parse(request.query)
			const result = await prescriptionRepository.list(query)

			return reply.status(200).send({
				statusCode: 200,
				message: 'Prescrições listadas com sucesso',
				...result,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'ZodError') {
				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'Parâmetros de consulta inválidos',
					details: error,
				})
			}

			request.log.error(error)
			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'Erro ao listar prescrições',
			})
		}
	}

	/**
	 * Busca uma prescrição por ID
	 */
	async getById(
		request: FastifyRequest<{
			Params: PrescriptionParams
		}>,
		reply: FastifyReply,
	) {
		try {
			const { id } = prescriptionParamsSchema.parse(request.params)
			const prescription = await prescriptionRepository.findById(id)

			if (!prescription) {
				return reply.status(404).send({
					statusCode: 404,
					error: 'Not Found',
					message: 'Prescrição não encontrada',
				})
			}

			return reply.status(200).send({
				statusCode: 200,
				message: 'Prescrição encontrada',
				data: prescription,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'ZodError') {
				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'ID inválido',
					details: error,
				})
			}

			request.log.error(error)
			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'Erro ao buscar prescrição',
			})
		}
	}

	/**
	 * Atualiza uma prescrição
	 */
	async update(
		request: FastifyRequest<{
			Params: PrescriptionParams
			Body: UpdatePrescriptionInput
		}>,
		reply: FastifyReply,
	) {
		try {
			const { id } = prescriptionParamsSchema.parse(request.params)
			const data = updatePrescriptionSchema.parse(request.body)

			// Verifica se a prescrição existe
			const exists = await prescriptionRepository.exists(id)
			if (!exists) {
				return reply.status(404).send({
					statusCode: 404,
					error: 'Not Found',
					message: 'Prescrição não encontrada',
				})
			}

			// Atualiza a prescrição
			const prescription = await prescriptionRepository.update(id, data)

			// Log de auditoria
			await auditService.logPrescriptionUpdated(
				request.user.id,
				id,
				data,
				request.ip,
				request.headers['user-agent'],
			)

			return reply.status(200).send({
				statusCode: 200,
				message: 'Prescrição atualizada com sucesso',
				data: prescription,
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'ZodError') {
				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'Dados inválidos',
					details: error,
				})
			}

			request.log.error(error)
			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'Erro ao atualizar prescrição',
			})
		}
	}

	/**
	 * Remove uma prescrição
	 */
	async delete(
		request: FastifyRequest<{
			Params: PrescriptionParams
		}>,
		reply: FastifyReply,
	) {
		try {
			const { id } = prescriptionParamsSchema.parse(request.params)

			// Verifica se a prescrição existe
			const exists = await prescriptionRepository.exists(id)
			if (!exists) {
				return reply.status(404).send({
					statusCode: 404,
					error: 'Not Found',
					message: 'Prescrição não encontrada',
				})
			}

			// Remove a prescrição
			await prescriptionRepository.delete(id)

			// Log de auditoria
			await auditService.logPrescriptionDeleted(
				request.user.id,
				id,
				{},
				request.ip,
				request.headers['user-agent'],
			)

			return reply.status(200).send({
				statusCode: 200,
				message: 'Prescrição removida com sucesso',
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'ZodError') {
				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'ID inválido',
					details: error,
				})
			}

			request.log.error(error)
			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'Erro ao remover prescrição',
			})
		}
	}

	/**
	 * Gera PDF da prescrição
	 */
	async generatePDF(
		request: FastifyRequest<{
			Params: PrescriptionParams
		}>,
		reply: FastifyReply,
	) {
		try {
			const { id } = prescriptionParamsSchema.parse(request.params)

			// Busca prescrição completa
			const prescription = await prescriptionRepository.findById(id)

			if (!prescription) {
				return reply.status(404).send({
					statusCode: 404,
					error: 'Not Found',
					message: 'Prescrição não encontrada',
				})
			}

			// Verifica permissão
			const isDoctor = prescription.doctorId === request.user.doctorId
			const isPatient = prescription.patientId === request.user.patientId
			const isAdmin = request.user.role === 'admin' || request.user.role === 'master'

			if (!isDoctor && !isPatient && !isAdmin) {
				return reply.status(403).send({
					statusCode: 403,
					error: 'Forbidden',
					message: 'Você não tem permissão para acessar esta prescrição',
				})
			}

			// Busca assinatura
			const { signatureRepository } = await import('../repositories/signature.repository')
			const signatures = await signatureRepository.findByDocument('prescription', id)
			const signature = signatures.length > 0 ? signatures[0] : undefined

			console.log(`🔍 Assinaturas encontradas: ${signatures.length}`)
			if (signature) {
				console.log('✅ Assinatura será incluída no PDF')
			} else {
				console.log('⚠️ Nenhuma assinatura encontrada para esta prescrição - PDF será gerado sem assinatura')
			}

			// Gera PDF
			const { pdfGeneratorService } = await import('../services/pdf-generator.service')
			const base64PDF = await pdfGeneratorService.generatePrescriptionPDF(
				prescription,
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
				await auditService.logPrescriptionPDFGenerated(
					request.user.id,
					id,
					request.ip,
					request.headers['user-agent'],
				)
			} catch (auditError) {
				console.error('⚠️ Erro ao registrar audit log:', auditError)
			}

			return reply.status(200).send({
				statusCode: 200,
				message: 'PDF gerado com sucesso',
				data: {
					pdf: base64PDF,
					filename: `medvision-prescricao-${prescription.patient.user.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`,
					mimeType: 'application/pdf',
					size: Buffer.from(base64PDF, 'base64').length,
				},
			})
		} catch (error) {
			console.error('❌ Error generating PDF:', error)
			if (error instanceof Error) {
				console.error('Error message:', error.message)
				console.error('Error stack:', error.stack)
			}

			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'Erro ao gerar PDF',
				details: error instanceof Error ? error.message : 'Erro desconhecido',
			})
		}
	}

	/**
	 * Assina uma prescrição existente
	 */
	async signPrescription(
		request: FastifyRequest<{
			Params: PrescriptionParams
		}>,
		reply: FastifyReply,
	) {
		try {
			const { id } = prescriptionParamsSchema.parse(request.params)

			// Busca prescrição
			const prescription = await prescriptionRepository.findById(id)

			if (!prescription) {
				return reply.status(404).send({
					statusCode: 404,
					error: 'Not Found',
					message: 'Prescrição não encontrada',
				})
			}

			// Verifica se é o médico da prescrição
			if (prescription.doctorId !== request.user.doctorId) {
				return reply.status(403).send({
					statusCode: 403,
					error: 'Forbidden',
					message: 'Apenas o médico responsável pode assinar a prescrição',
				})
			}

			const { signatureService } = await import('../services/signature.service')
			const { signatureRepository } = await import('../repositories/signature.repository')

			// Verifica se já tem assinatura
			const existingSignatures = await signatureRepository.findByDocument('prescription', id)
			if (existingSignatures.length > 0) {
				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'Prescrição já está assinada',
				})
			}

			// Gera assinatura
			const documentContent = {
				id: prescription.id,
				patientId: prescription.patientId,
				doctorId: prescription.doctorId,
				medicamentos: prescription.medicamentos,
				orientacoesGerais: prescription.orientacoesGerais,
				createdAt: prescription.createdAt,
			}

			const documentHash = signatureService.generateDocumentHash(JSON.stringify(documentContent))
			const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

			const signatureData = {
				documentType: 'prescription' as const,
				documentId: prescription.id,
				documentHash,
				certificateId,
				signerId: prescription.doctorId,
				signerName: prescription.doctor.user.name,
				signerCRM: prescription.doctor.crm,
				ipAddress: request.ip,
				userAgent: request.headers['user-agent'] || 'Unknown',
			}

			const signature = signatureService.signDocument(signatureData)

			// Salva assinatura
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

			return reply.status(201).send({
				statusCode: 201,
				message: 'Prescrição assinada com sucesso',
				data: {
					certificateId,
					signedAt: new Date(),
					signedBy: signatureData.signerName,
					documentHash: signature.documentHash,
					certificate,
				},
			})
		} catch (error) {
			console.error('Error signing prescription:', error)
			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'Erro ao assinar prescrição',
			})
		}
	}
}

export const prescriptionController = new PrescriptionController()
