import { prisma } from '../lib/prisma'

interface CreateSignatureData {
	certificateId: string
	documentType: string
	documentId: string
	documentHash: string
	signerId: string
	signerName: string
	signerCRM?: string
	signerRole: string
	signature: string
	ipAddress?: string
	userAgent?: string
	signedAt: Date
}

export class SignatureRepository {
	async create(data: CreateSignatureData) {
		return prisma.signature.create({ data })
	}

	async findByCertificateId(certificateId: string) {
		return prisma.signature.findUnique({
			where: { certificateId },
		})
	}

	async findByDocument(documentType: string, documentId: string) {
		return prisma.signature.findMany({
			where: { documentType, documentId },
			orderBy: { signedAt: 'desc' },
		})
	}

	async markAsVerified(certificateId: string, verifiedBy: string) {
		return prisma.signature.update({
			where: { certificateId },
			data: {
				verified: true,
				verifiedAt: new Date(),
				verifiedBy,
			},
		})
	}
}

export const signatureRepository = new SignatureRepository()
