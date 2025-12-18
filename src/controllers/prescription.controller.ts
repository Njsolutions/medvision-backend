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

			// Log de auditoria
			await auditService.logPrescriptionCreated(
				request.user.id,
				prescription.id,
				{
					patientId: data.patientId,
					doctorId: data.doctorId,
					medicamentosCount: data.medicamentos.length,
				},
				request.ip,
				request.headers['user-agent'],
			)

			return reply.status(201).send({
				statusCode: 201,
				message: 'Prescrição criada com sucesso',
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
}

export const prescriptionController = new PrescriptionController()
