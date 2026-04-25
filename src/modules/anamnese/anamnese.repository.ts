import { db } from '@/lib/prisma';
import type { CreateAnamneseInput, UpdateAnamneseInput } from '@/modules/anamnese/anamnese.schema';

export class AnamneseRepository {
	async create(data: CreateAnamneseInput) {
		return db.anaminese.create({
			data,
			include: {
				patient: {
					select: {
						id: true,
						age: true,
						birthDate: true,
						gender: true,
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
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
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
		});
	}

	async findById(id: string) {
		return db.anaminese.findUnique({
			where: { id },
			include: {
				patient: {
					select: {
						id: true,
						age: true,
						birthDate: true,
						gender: true,
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
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
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
		});
	}

	async findByPatientId(patientId: string) {
		return db.anaminese.findMany({
			where: { patientId },
			include: {
				doctor: {
					select: {
						id: true,
						crm: true,
						specialty: true,
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});
	}

	async findByDoctorId(doctorId: string) {
		return db.anaminese.findMany({
			where: { doctorId },
			include: {
				patient: {
					select: {
						id: true,
						age: true,
						birthDate: true,
						gender: true,
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
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
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});
	}

	async findAll() {
		return db.anaminese.findMany({
			include: {
				patient: {
					select: {
						id: true,
						age: true,
						birthDate: true,
						gender: true,
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
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
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});
	}

	async update(id: string, data: UpdateAnamneseInput) {
		return db.anaminese.update({
			where: { id },
			data,
			include: {
				patient: {
					select: {
						id: true,
						age: true,
						birthDate: true,
						gender: true,
						user: {
							select: {
								id: true,
								name: true,
								cpf: true,
								email: true,
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
								cpf: true,
								email: true,
								phone: true,
							},
						},
					},
				},
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						status: true,
						reason: true,
					},
				},
			},
		});
	}

	async delete(id: string) {
		return db.anaminese.delete({
			where: { id },
		});
	}

	async getUserWithDoctor(userId: string) {
		return db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				doctor: {
					select: {
						id: true,
						crm: true,
						specialty: true,
					},
				},
			},
		});
	}
}

export const anamneseRepository = new AnamneseRepository();
