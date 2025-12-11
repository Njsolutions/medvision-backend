import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export class StorageService {
	private s3Client: S3Client
	private bucket: string
	private region: string

	constructor() {
		// Validar variáveis de ambiente
		const endpoint = process.env.R2_ENDPOINT
		const accessKeyId = process.env.R2_ACCESS_KEY_ID
		const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
		const bucketName = process.env.R2_BUCKET_NAME

		if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
			throw new Error(
				'Missing R2 configuration. Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables.',
			)
		}

		this.region = 'auto'
		this.bucket = bucketName

		this.s3Client = new S3Client({
			region: this.region,
			endpoint,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		})
	}

	/**
	 * Gera uma chave única para armazenamento baseada no patientId e timestamp
	 */
	generateStorageKey(patientId: string, fileName: string): string {
		const timestamp = Date.now()
		const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
		return `patients/${patientId}/${timestamp}-${sanitizedFileName}`
	}

	/**
	 * Faz upload de um arquivo para o R2
	 */
	async uploadFile(
		file: Buffer,
		key: string,
		mimeType: string,
	): Promise<string> {
		try {
			const command = new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: file,
				ContentType: mimeType,
			})

			await this.s3Client.send(command)
			return key
		} catch (error) {
			console.error('Error uploading file to R2:', error)
			throw new Error('Failed to upload file to storage')
		}
	}

	/**
	 * Gera uma URL assinada para download do arquivo
	 * @param key - Chave do arquivo no R2
	 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
	 */
	async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucket,
				Key: key,
			})

			const url = await getSignedUrl(this.s3Client, command, { expiresIn })
			return url
		} catch (error) {
			console.error('Error generating signed URL:', error)
			throw new Error('Failed to generate download URL')
		}
	}

	/**
	 * Deleta um arquivo do R2
	 */
	async deleteFile(key: string): Promise<void> {
		try {
			const command = new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: key,
			})

			await this.s3Client.send(command)
		} catch (error) {
			console.error('Error deleting file from R2:', error)
			throw new Error('Failed to delete file from storage')
		}
	}

	/**
	 * Valida o tamanho do arquivo (limite: 50MB)
	 */
	validateFileSize(fileSize: number): boolean {
		const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB em bytes
		return fileSize <= MAX_FILE_SIZE
	}

	/**
	 * Valida o tipo MIME do arquivo
	 */
	validateMimeType(mimeType: string): boolean {
		const allowedMimeTypes = [
			// Imagens
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'image/webp',
			// PDFs
			'application/pdf',
			// Documentos
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			// Texto
			'text/plain',
		]

		return allowedMimeTypes.includes(mimeType)
	}
}

export const storageService = new StorageService()
