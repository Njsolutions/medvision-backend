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

	async create(data: CreateUtiInput) {
		return db.uti.create({
			data: {
				patientId: data.patientId || null,
				status: data.status === 'maintenance' ? 'available' : data.status,
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
		return db.uti.update({
			where: { id },
			data: {
				...(data.status && data.status !== 'maintenance' && { status: data.status }),
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
	}

	async checkPatientExists(patientId: string) {
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
