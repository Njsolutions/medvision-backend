import { anamneseRepository } from '@/repositories/anamnese.repository';
import {
	createAnamneseSchema,
	updateAnamneseSchema,
	getAnamneseByIdSchema,
	getAnamnesesByPatientSchema,
	getAnamnesesByDoctorSchema,
} from '@/schemas/anamnese.schema';
import { auditService } from '@/services/audit.service';
import { ImpactLevel } from '@/types/audit.types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export class AnamneseController {
	constructor(_fastify: FastifyInstance) {}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = createAnamneseSchema.safeParse(req.body);

			if (!validation.success) {
				return res.status(400).send({
					error: 'Invalid data',
					details: validation.error.errors,
				});
			}

			const anamnese = await anamneseRepository.create(validation.data);

			// Audit log
			await auditService.log({
				userId: req.user.sub,
				action: 'CREATE_ANAMNESE',
				description: `Anamnese criada para paciente ${validation.data.patientId}`,
				content: {
					anamneseId: anamnese.id,
					patientId: anamnese.patientId,
					doctorId: anamnese.doctorId,
					appointmentId: anamnese.appointmentId,
				},
				impactLevel: ImpactLevel.MEDIUM,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			});

			return res.status(201).send({
				message: 'Anamnese criada com sucesso',
				data: anamnese,
			});
		} catch (error) {
			console.error('Error creating anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getById(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamneseByIdSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'ID inválido',
					details: validation.error.errors,
				});
			}

			const anamnese = await anamneseRepository.findById(validation.data.id);

			if (!anamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			return res.status(200).send({
				message: 'Anamnese encontrada',
				data: anamnese,
			});
		} catch (error) {
			console.error('Error getting anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getByPatientId(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamnesesByPatientSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'Patient ID inválido',
					details: validation.error.errors,
				});
			}

			const anamneses = await anamneseRepository.findByPatientId(validation.data.patientId);

			return res.status(200).send({
				message: 'Anamneses encontradas',
				data: anamneses,
			});
		} catch (error) {
			console.error('Error getting anamneses by patient:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getByDoctorId(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamnesesByDoctorSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'Doctor ID inválido',
					details: validation.error.errors,
				});
			}

			const anamneses = await anamneseRepository.findByDoctorId(validation.data.doctorId);

			return res.status(200).send({
				message: 'Anamneses encontradas',
				data: anamneses,
			});
		} catch (error) {
			console.error('Error getting anamneses by doctor:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getAll(_req: FastifyRequest, res: FastifyReply) {
		try {
			const anamneses = await anamneseRepository.findAll();

			return res.status(200).send({
				message: 'Anamneses encontradas',
				data: anamneses,
			});
		} catch (error) {
			console.error('Error getting all anamneses:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			const paramsValidation = getAnamneseByIdSchema.safeParse(req.params);

			if (!paramsValidation.success) {
				return res.status(400).send({
					error: 'ID inválido',
					details: paramsValidation.error.errors,
				});
			}

			const dataValidation = updateAnamneseSchema.safeParse(req.body);

			if (!dataValidation.success) {
				return res.status(400).send({
					error: 'Dados inválidos',
					details: dataValidation.error.errors,
				});
			}

			const existingAnamnese = await anamneseRepository.findById(paramsValidation.data.id);

			if (!existingAnamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			const anamnese = await anamneseRepository.update(
				paramsValidation.data.id,
				dataValidation.data
			);

			// Audit log
			await auditService.log({
				userId: req.user.sub,
				action: 'UPDATE_ANAMNESE',
				description: `Anamnese ${anamnese.id} atualizada`,
				content: {
					anamneseId: anamnese.id,
					patientId: anamnese.patientId,
					doctorId: anamnese.doctorId,
					changes: dataValidation.data,
				},
				impactLevel: ImpactLevel.MEDIUM,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			});

			return res.status(200).send({
				message: 'Anamnese atualizada com sucesso',
				data: anamnese,
			});
		} catch (error) {
			console.error('Error updating anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async delete(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamneseByIdSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'ID inválido',
					details: validation.error.errors,
				});
			}

			const existingAnamnese = await anamneseRepository.findById(validation.data.id);

			if (!existingAnamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			await anamneseRepository.delete(validation.data.id);

			// Audit log
			await auditService.log({
				userId: req.user.sub,
				action: 'DELETE_ANAMNESE',
				description: `Anamnese ${validation.data.id} deletada`,
				content: {
					anamneseId: validation.data.id,
					patientId: existingAnamnese.patientId,
					doctorId: existingAnamnese.doctorId,
				},
				impactLevel: ImpactLevel.HIGH,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			});

			return res.status(200).send({
				message: 'Anamnese deletada com sucesso',
			});
		} catch (error) {
			console.error('Error deleting anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}
}
