import { db } from '@/lib/prisma'
import type { CreateUtiInput, UpdateUtiInput } from '@/schemas/uti.schema'

export class UtiRepository {
	async findById(id: string) {
		return db.uti.findUnique({
			where: { id },
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		})
	}

	async findAll() {
		return db.uti.findMany({
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
		})
	}

	async create(data: CreateUtiInput & { roomLink?: string | null }) {
		return db.uti.create({
			data: {
				patientId: data.patientId || null,
				status: data.patientId ? 'occupied' : 'available', // Auto-determina status baseado no paciente
				roomLink: data.roomLink || null,
			},
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		})
	}

	async update(id: string, data: UpdateUtiInput) {
		// Determina o status baseado no patientId se não foi fornecido explicitamente
		const statusToSet = data.status || (data.patientId ? 'occupied' : data.patientId === null ? 'available' : undefined)

		return db.uti.update({
			where: { id },
			data: {
				...(statusToSet && { status: statusToSet }),
				...(data.roomLink !== undefined && { roomLink: data.roomLink }),
				...(data.patientId !== undefined && {
					patient: data.patientId ? { connect: { id: data.patientId } } : { disconnect: true },
				}),
			},
			include: {
				patient: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								phone: true,
								email: true,
								active: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
				},
			},
		})
	}	async checkPatientExists(patientId: string) {
		return db.patient.findUnique({
			where: { id: patientId },
		})
	}

	async checkPatientHasUti(patientId: string) {
		return db.uti.findUnique({
			where: { patientId },
		})
	}
}
