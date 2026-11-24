import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { patientFileRepository } from '@/modules/patientfile/patientfile.repository'
import { storageService } from '@/services/storage.service'
import { auditService } from '@/services/audit.service'
import { realtimeService } from '@/services/realtime.service'
import { doctorIdsForPatient } from '@/services/realtime-audience'
import { canAccessPatient, isAdminLike, isDoctor } from '@/utils/security/access-control'
import { logger } from '@/lib/logger'
import {
	UploadFileSchema,
	GetFileUrlSchema,
	ListPatientFilesSchema,
	DeleteFileSchema,
	DownloadFileSchema,
} from '@/modules/patientfile/patientfile.schema'

export class PatientFileController {
	constructor(private fastify: FastifyInstance) {}

	/**
	 * Upload de arquivo
	 */
	async uploadFile(req: FastifyRequest, res: FastifyReply) {
		try {
			// Validação de multipart
			const data = await req.file()

			if (!data) {
				return res.status(400).send({ error: 'No file provided' })
			}

			// Obter campos do formulário
			const fields = data.fields as Record<string, { value: string }>

			const patientId = fields.patientId?.value || (fields.patientId as any)
			const fileType = fields.fileType?.value || (fields.fileType as any)

			if (!patientId || !fileType) {
				return res.status(400).send({
					error: 'Missing required fields: patientId and fileType',
				})
			}

			if (!(isAdminLike(req.user) || isDoctor(req.user)) || !(await canAccessPatient(req.user, patientId))) {
				return res.status(403).send({ error: 'Insufficient permissions to upload file for this patient' })
			}

			// Converter o stream em buffer
			const buffer = await data.toBuffer()
			const fileName = data.filename
			const mimeType = data.mimetype
			const fileSize = buffer.length

			// Validar tamanho do arquivo
			if (!storageService.validateFileSize(fileSize)) {
				return res.status(400).send({
					error: 'File size exceeds maximum limit of 50MB',
				})
			}

			// Validar tipo MIME
			if (!storageService.validateMimeType(mimeType)) {
				return res.status(400).send({
					error: 'Invalid file type. Only images, PDFs, and documents are allowed',
				})
			}

			// Gerar chave de armazenamento
			const storageKey = storageService.generateStorageKey(patientId, fileName)

			// Upload para R2
			await storageService.uploadFile(buffer, storageKey, mimeType)

			// Salvar metadados no banco
			const file = await patientFileRepository.create({
				patientId,
				fileName,
				fileType,
				mimeType,
				fileSize,
				storageKey,
				uploadedBy: req.user?.id || 'system',
			})

			// Audit log
			await auditService.log({
				userId: req.user?.id || 'system',
				action: 'PATIENT_FILE_UPLOAD',
				description: `Uploaded file ${fileName} for patient ${patientId}`,
				content: {
					fileId: file.id,
					fileName,
					fileSize,
					patientId,
				},
				impactLevel: 'medium',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			this.broadcastPatientFileEvent('patientFile.created', file)

			return res.status(201).send({
				message: 'File uploaded successfully',
				data: file,
			})
		} catch (error) {
			req.log.error({ err: error }, '❌ Error uploading file')
			return res.status(500).send({ error: 'Failed to upload file' })
		}
	}

	/**
	 * Obter URL assinada para download
	 */
	async getFileUrl(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = GetFileUrlSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({
					error: 'Invalid file ID',
					details: params.error,
				})
			}

			const file = await patientFileRepository.findById(params.data.id)

			if (!file) {
				return res.status(404).send({ error: 'File not found' })
			}

			if (!(await canAccessPatient(req.user, file.patientId))) {
				return res.status(403).send({ error: 'Insufficient permissions to access this file' })
			}

			// Gerar URL assinada válida por 1 hora
			const signedUrl = await storageService.getSignedUrl(file.storageKey, 3600)

			// Audit log
			await auditService.log({
				userId: req.user?.id || 'system',
				action: 'PATIENT_FILE_ACCESS',
				description: `Accessed file ${file.fileName}`,
				content: {
					fileId: file.id,
					fileName: file.fileName,
					patientId: file.patientId,
				},
				impactLevel: 'low',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			return res.status(200).send({
				message: 'File URL generated successfully',
				data: {
					url: signedUrl,
					expiresIn: 3600,
					file: {
						id: file.id,
						fileName: file.fileName,
						fileType: file.fileType,
						fileSize: file.fileSize,
						mimeType: file.mimeType,
						createdAt: file.createdAt,
					},
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error generating file URL')
			return res.status(500).send({ error: 'Failed to generate file URL' })
		}
	}

	/**
	 * Listar arquivos de um paciente
	 */
	async listPatientFiles(req: FastifyRequest, res: FastifyReply) {
		try {
			const requestParams = typeof req.params === 'object' && req.params !== null ? req.params : {}
			const requestQuery = typeof req.query === 'object' && req.query !== null ? req.query : {}
			const params = ListPatientFilesSchema.safeParse({
				...requestParams,
				...requestQuery,
			})

			if (!params.success) {
				return res.status(400).send({
					error: 'Invalid request parameters',
					details: params.error,
				})
			}

			if (!(await canAccessPatient(req.user, params.data.patientId))) {
				return res.status(403).send({ error: 'Insufficient permissions to list files for this patient' })
			}

			const result = await patientFileRepository.listByPatient(params.data)

			return res.status(200).send({
				message: 'Files retrieved successfully',
				data: result,
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error listing files')
			return res.status(500).send({ error: 'Failed to list files' })
		}
	}

	/**
	 * Deletar arquivo (soft delete)
	 */
	async deleteFile(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = DeleteFileSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({
					error: 'Invalid file ID',
					details: params.error,
				})
			}

			const file = await patientFileRepository.findById(params.data.id)

			if (!file) {
				return res.status(404).send({ error: 'File not found' })
			}

			if (!isAdminLike(req.user)) {
				return res.status(403).send({ error: 'Insufficient permissions to delete files' })
			}

			// Soft delete no banco
			await patientFileRepository.softDelete(params.data.id)

			// Opcional: deletar do R2 também (ou fazer cleanup periódico)
			// await storageService.deleteFile(file.storageKey)

			// Audit log
			await auditService.log({
				userId: req.user?.id || 'system',
				action: 'PATIENT_FILE_DELETE',
				description: `Deleted file ${file.fileName}`,
				content: {
					fileId: file.id,
					fileName: file.fileName,
					patientId: file.patientId,
				},
				impactLevel: 'high',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			this.broadcastPatientFileEvent('patientFile.deleted', file)

			return res.status(200).send({
				message: 'File deleted successfully',
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error deleting file')
			return res.status(500).send({ error: 'Failed to delete file' })
		}
	}

	/**
	 * Obter estatísticas de arquivos de um paciente
	 */
	async getPatientFileStats(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = GetFileUrlSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({
					error: 'Invalid patient ID',
					details: params.error,
				})
			}

			const patientId = params.data.id

			if (!(await canAccessPatient(req.user, patientId))) {
				return res.status(403).send({ error: 'Insufficient permissions to view file statistics for this patient' })
			}

			const [totalFiles, totalSize] = await Promise.all([
				patientFileRepository.countByPatient(patientId),
				patientFileRepository.getTotalSizeByPatient(patientId),
			])

			return res.status(200).send({
				message: 'File statistics retrieved successfully',
				data: {
					patientId,
					totalFiles,
					totalSizeBytes: totalSize,
					totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
				},
			})
		} catch (error) {
			req.log.error({ err: error }, 'Error getting file stats')
			return res.status(500).send({ error: 'Failed to get file statistics' })
		}
	}

	/**
	 * Download de arquivo
	 */
	async downloadFile(req: FastifyRequest, res: FastifyReply) {
		try {
			const params = DownloadFileSchema.safeParse(req.params)

			if (!params.success) {
				return res.status(400).send({
					error: 'Invalid file ID',
					details: params.error,
				})
			}

			const file = await patientFileRepository.findById(params.data.id)

			if (!file) {
				return res.status(404).send({ error: 'File not found' })
			}

			if (!(await canAccessPatient(req.user, file.patientId))) {
				return res.status(403).send({ error: 'Insufficient permissions to download this file' })
			}

			// Obter arquivo do storage
			const fileData = await storageService.downloadFile(file.storageKey)

			// Audit log - registrar quem fez o download
			await auditService.log({
				userId: req.user?.id || 'system',
				action: 'PATIENT_FILE_DOWNLOAD',
				description: `Downloaded file ${file.fileName} for patient ${file.patientId}`,
				content: {
					fileId: file.id,
					fileName: file.fileName,
					fileSize: file.fileSize,
					patientId: file.patientId,
					downloadedBy: req.user?.name || 'Unknown',
				},
				impactLevel: 'medium',
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			})

			// Configurar headers para download
			res.header('Content-Type', fileData.contentType)
			res.header('Content-Disposition', `attachment; filename="${file.fileName}"`)

			// Retornar o arquivo como stream
			return res.send(fileData.body)
		} catch (error) {
			req.log.error({ err: error }, 'Error downloading file')
			return res.status(500).send({ error: 'Failed to download file' })
		}
	}

	// Sem nome/tipo do arquivo no payload: o cliente refaz o GET autorizado se precisar.
	private broadcastPatientFileEvent(type: 'patientFile.created' | 'patientFile.deleted', file: {
		id: string
		patientId: string
	}) {
		void doctorIdsForPatient(file.patientId)
			.then((doctorIds) => {
				realtimeService.publish(
					{ type, data: { fileId: file.id, patientId: file.patientId } },
					{ patientId: file.patientId, doctorIds },
				)
			})
			.catch((error) => logger.error({ err: error }, 'Error publishing patient file event'))
	}
}
