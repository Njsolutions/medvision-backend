import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { patientFileRepository } from '@/modules/patientfile/patientfile.repository'
import { storageService } from '@/services/storage.service'
import { auditService } from '@/services/audit.service'
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

			console.log('📥 Upload request received')

			if (!data) {
				console.log('❌ No file provided in request')
				return res.status(400).send({ error: 'No file provided' })
			}

			console.log('📄 File data:', {
				filename: data.filename,
				mimetype: data.mimetype,
				encoding: data.encoding,
			})

			// Obter campos do formulário
			const fields = data.fields as Record<string, { value: string }>
			
			// Log seguro dos campos (evitando referências circulares)
			const fieldKeys = Object.keys(fields)
			console.log('📋 Fields received:', fieldKeys)
			const fieldValues: Record<string, any> = {}
			for (const key of fieldKeys) {
				fieldValues[key] = fields[key]?.value || fields[key]
			}
			console.log('📋 Field values:', fieldValues)

			const patientId = fields.patientId?.value || (fields.patientId as any)
			const fileType = fields.fileType?.value || (fields.fileType as any)

			console.log('🔍 Extracted values:', { patientId, fileType })

			if (!patientId || !fileType) {
				console.log('❌ Missing required fields:', {
					patientId: patientId || 'MISSING',
					fileType: fileType || 'MISSING',
					allFields: Object.keys(fields),
				})
				return res.status(400).send({
					error: 'Missing required fields: patientId and fileType',
				})
			}

			// Converter o stream em buffer
			const buffer = await data.toBuffer()
			const fileName = data.filename
			const mimeType = data.mimetype
			const fileSize = buffer.length

			console.log('📦 File details:', {
				fileName,
				mimeType,
				fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
			})

			// Validar tamanho do arquivo
			if (!storageService.validateFileSize(fileSize)) {
				console.log('❌ File size exceeds limit:', fileSize)
				return res.status(400).send({
					error: 'File size exceeds maximum limit of 50MB',
				})
			}

			// Validar tipo MIME
			if (!storageService.validateMimeType(mimeType)) {
				console.log('❌ Invalid MIME type:', mimeType)
				return res.status(400).send({
					error: 'Invalid file type. Only images, PDFs, and documents are allowed',
				})
			}

			// Gerar chave de armazenamento
			const storageKey = storageService.generateStorageKey(patientId, fileName)
			console.log('🔑 Generated storage key:', storageKey)

			// Upload para R2
			console.log('☁️ Uploading to R2...')
			await storageService.uploadFile(buffer, storageKey, mimeType)
			console.log('✅ Upload to R2 successful')

			// Salvar metadados no banco
			console.log('💾 Saving metadata to database...')
			const file = await patientFileRepository.create({
				patientId,
				fileName,
				fileType,
				mimeType,
				fileSize,
				storageKey,
				uploadedBy: req.user?.id || 'system',
			})
			console.log('✅ Metadata saved, file ID:', file.id)

			// Audit log
			console.log('📝 Creating audit log...')
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

			console.log('🎉 Upload completed successfully!')
			return res.status(201).send({
				message: 'File uploaded successfully',
				data: file,
			})
		} catch (error) {
			console.error('❌ Error uploading file:', error)
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
			console.error('Error generating file URL:', error)
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

			const result = await patientFileRepository.listByPatient(params.data)

			return res.status(200).send({
				message: 'Files retrieved successfully',
				data: result,
			})
		} catch (error) {
			console.error('Error listing files:', error)
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

			return res.status(200).send({
				message: 'File deleted successfully',
			})
		} catch (error) {
			console.error('Error deleting file:', error)
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
			console.error('Error getting file stats:', error)
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
			console.error('Error downloading file:', error)
			return res.status(500).send({ error: 'Failed to download file' })
		}
	}
}
