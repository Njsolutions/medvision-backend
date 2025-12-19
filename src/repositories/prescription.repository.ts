import { db } from '@/lib/prisma'
import type {
	CreatePrescriptionInput,
	ListPrescriptionQuery,
	UpdatePrescriptionInput,
} from '@/schemas/prescription.schema'

export class PrescriptionRepository {
	/**
	 * Cria uma nova prescrição com medicamentos
	 */
	async create(data: CreatePrescriptionInput) {
		return await db.prescription.create({
			data: {
				patientId: data.patientId,
				doctorId: data.doctorId,
				appointmentId: data.appointmentId || null,
				orientacoesGerais: data.orientacoesGerais || null,
				medicamentos: {
					create: data.medicamentos.map((med) => ({
						nome: med.nome,
						dosagem: med.dosagem,
						frequencia: med.frequencia,
						duracao: med.duracao,
						via: med.via,
						orientacoes: med.orientacoes || null,
					})),
				},
			},
			include: {
				medicamentos: true,
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								cpf: true,
							},
						},
					},
				},
				doctor: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								cpf: true,
							},
						},
					},
				},
				appointment: true,
			},
		})
	}

	/**
	 * Lista prescrições com filtros opcionais
	 */
	async list(query: ListPrescriptionQuery) {
		const { patientId, doctorId, appointmentId, page, limit } = query
		const skip = (page - 1) * limit

		const where = {
			...(patientId && { patientId }),
			...(doctorId && { doctorId }),
			...(appointmentId && { appointmentId }),
		}

		const [prescriptions, total] = await Promise.all([
			db.prescription.findMany({
				where,
				include: {
					medicamentos: true,
					patient: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									cpf: true,
								},
							},
						},
					},
					doctor: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									cpf: true,
								},
							},
						},
					},
					appointment: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take: limit,
			}),
			db.prescription.count({ where }),
		])

		return {
			data: prescriptions,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		}
	}

	/**
	 * Busca uma prescrição por ID
	 */
	async findById(id: string) {
		return await db.prescription.findUnique({
			where: { id },
			select: {
				id: true,
				patientId: true,
				doctorId: true,
				appointmentId: true,
				orientacoesGerais: true,
				createdAt: true,
				updatedAt: true,
				medicamentos: {
					orderBy: {
						createdAt: 'asc',
					},
					select: {
						id: true,
						nome: true,
						dosagem: true,
						frequencia: true,
						duracao: true,
						via: true,
						orientacoes: true,
						createdAt: true,
					},
				},
				patient: {
					select: {
						id: true,
						age: true,
						gender: true,
						birthDate: true,
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								cpf: true,
								phone: true,
							},
						},
					},
				},
				doctor: {
					select: {
						id: true,
						crm: true,
						specialty: true,
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
				appointment: true,
			},
		})
	}

	/**
	 * Atualiza uma prescrição
	 */
	async update(id: string, data: UpdatePrescriptionInput) {
		// Se há medicamentos para atualizar, remove os antigos e cria novos
		if (data.medicamentos) {
			await db.medicamento.deleteMany({
				where: { prescriptionId: id },
			})
		}

		return await db.prescription.update({
			where: { id },
			data: {
				...(data.orientacoesGerais !== undefined && {
					orientacoesGerais: data.orientacoesGerais,
				}),
				...(data.medicamentos && {
					medicamentos: {
						create: data.medicamentos.map((med) => ({
							nome: med.nome,
							dosagem: med.dosagem,
							frequencia: med.frequencia,
							duracao: med.duracao,
							via: med.via,
							orientacoes: med.orientacoes || null,
						})),
					},
				}),
			},
			include: {
				medicamentos: true,
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								cpf: true,
							},
						},
					},
				},
				doctor: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								cpf: true,
							},
						},
					},
				},
				appointment: true,
			},
		})
	}

	/**
	 * Remove uma prescrição
	 */
	async delete(id: string) {
		return await db.prescription.delete({
			where: { id },
		})
	}

	/**
	 * Verifica se uma prescrição existe
	 */
	async exists(id: string) {
		const count = await db.prescription.count({
			where: { id },
		})
		return count > 0
	}

	/**
	 * Verifica se paciente existe
	 */
	async patientExists(patientId: string) {
		const count = await db.patient.count({
			where: { id: patientId },
		})
		return count > 0
	}

	/**
	 * Verifica se médico existe
	 */
	async doctorExists(doctorId: string) {
		const count = await db.doctor.count({
			where: { id: doctorId },
		})
		return count > 0
	}

	/**
	 * Verifica se agendamento existe
	 */
	async appointmentExists(appointmentId: string) {
		const count = await db.appointment.count({
			where: { id: appointmentId },
		})
		return count > 0
	}
}

export const prescriptionRepository = new PrescriptionRepository()
