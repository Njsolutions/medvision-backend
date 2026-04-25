import { db } from '@/lib/prisma'
import type {
	UploadFileInput,
	ListPatientFilesInput,
} from '@/modules/patientfile/patientfile.schema'

export class PatientFileRepository {
	/**
	 * Cria um novo registro de arquivo no banco
	 */
	async create(data: {
		patientId: string
		fileName: string
		fileType: string
		mimeType: string
		fileSize: number
		storageKey: string
		storageUrl?: string
		uploadedBy: string
	}) {
		return db.patientFile.create({
			data,
			include: {
				patient: {
					select: {
						id: true,
						user: {
							select: {
								name: true,
								cpf: true,
							},
						},
					},
				},
				uploadedByUser: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		})
	}

	/**
	 * Busca um arquivo por ID
	 */
	async findById(id: string) {
		return db.patientFile.findUnique({
			where: { id, deletedAt: null },
			include: {
				patient: {
					select: {
						id: true,
						user: {
							select: {
								name: true,
								cpf: true,
							},
						},
					},
				},
				uploadedByUser: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		})
	}

	/**
	 * Lista arquivos de um paciente com paginação
	 */
	async listByPatient(params: ListPatientFilesInput) {
		const { patientId, fileType, page = 1, limit = 20 } = params
		const skip = (page - 1) * limit

		const where = {
			patientId,
			deletedAt: null,
			...(fileType && { fileType }),
		}

		const [files, total] = await Promise.all([
			db.patientFile.findMany({
				where,
				skip,
				take: limit,
				orderBy: {
					createdAt: 'desc',
				},
				include: {
					uploadedByUser: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			}),
			db.patientFile.count({ where }),
		])

		return {
			files,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		}
	}

	/**
	 * Busca arquivo por storageKey
	 */
	async findByStorageKey(storageKey: string) {
		return db.patientFile.findUnique({
			where: { storageKey, deletedAt: null },
		})
	}

	/**
	 * Soft delete de um arquivo
	 */
	async softDelete(id: string) {
		return db.patientFile.update({
			where: { id },
			data: {
				deletedAt: new Date(),
			},
		})
	}

	/**
	 * Hard delete de um arquivo (use com cuidado)
	 */
	async hardDelete(id: string) {
		return db.patientFile.delete({
			where: { id },
		})
	}

	/**
	 * Conta total de arquivos de um paciente
	 */
	async countByPatient(patientId: string) {
		return db.patientFile.count({
			where: {
				patientId,
				deletedAt: null,
			},
		})
	}

	/**
	 * Calcula o tamanho total de arquivos de um paciente
	 */
	async getTotalSizeByPatient(patientId: string): Promise<number> {
		const result = await db.patientFile.aggregate({
			where: {
				patientId,
				deletedAt: null,
			},
			_sum: {
				fileSize: true,
			},
		})

		return result._sum.fileSize || 0
	}
}

export const patientFileRepository = new PatientFileRepository()
