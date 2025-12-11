import { z } from 'zod'

export const FileCategory = z.enum([
	'EXAM_RESULT',
	'MEDICAL_IMAGE',
	'PRESCRIPTION',
	'DOCUMENT',
	'REPORT',
	'CONSENT_FORM',
])

export const UploadFileSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID'),
	fileName: z.string().min(1, 'File name is required'),
	fileType: z.string().min(1, 'File type is required'),
	mimeType: z.string().min(1, 'MIME type is required'),
	fileSize: z.number().int().positive('File size must be positive'),
})

export const GetFileUrlSchema = z.object({
	id: z.string().uuid('Invalid file ID'),
})

export const ListPatientFilesSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID'),
	fileType: z.string().optional(),
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().max(100).default(20),
})

export const DeleteFileSchema = z.object({
	id: z.string().uuid('Invalid file ID'),
})

export const DownloadFileSchema = z.object({
	id: z.string().uuid('Invalid file ID'),
})

export type UploadFileInput = z.infer<typeof UploadFileSchema>
export type GetFileUrlInput = z.infer<typeof GetFileUrlSchema>
export type ListPatientFilesInput = z.infer<typeof ListPatientFilesSchema>
export type DeleteFileInput = z.infer<typeof DeleteFileSchema>
export type DownloadFileInput = z.infer<typeof DownloadFileSchema>
export type FileCategoryType = z.infer<typeof FileCategory>
