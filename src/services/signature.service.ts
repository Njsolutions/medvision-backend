import crypto from 'node:crypto'

export interface SignatureData {
	documentHash: string
	signerId: string
	signerName: string
	signerCRM?: string | null
	timestamp?: Date
	ipAddress?: string
	userAgent?: string
	documentType: string
	documentId: string
}

export interface SignatureResult {
	signature: string
	documentHash: string
	timestamp: Date
	certificateId: string
}

interface CertificateSummary {
	certificateId: string
	signedBy: string
	signedAt: Date
	documentHash: string
	crm?: string | null
}

export class SignatureService {
	private readonly secretKey: string

	constructor() {
		this.secretKey = process.env.SIGNATURE_SECRET_KEY || 'change-this-secret-key-in-production'
		
		if (this.secretKey === 'change-this-secret-key-in-production') {
			console.warn('⚠️  AVISO: Use uma chave secreta forte em produção!')
		}
	}

	/**
	 * Gera um hash SHA-256 do conteúdo do documento
	 */
	generateDocumentHash(content: Buffer | string | Record<string, any>): string {
		const stringContent = typeof content === 'object' && !(content instanceof Buffer)
			? JSON.stringify(content, null, 0) // Remove espaços para hash consistente
			: content

		return crypto
			.createHash('sha256')
			.update(stringContent)
			.digest('hex')
	}

	/**
	 * Cria uma assinatura eletrônica do documento
	 */
	signDocument(data: SignatureData): SignatureResult {
		const timestamp = data.timestamp ?? new Date()

		// Cria string com todos os dados relevantes
		const signaturePayload = JSON.stringify({
			documentHash: data.documentHash,
			signerId: data.signerId,
			signerName: data.signerName,
			signerCRM: data.signerCRM,
			timestamp: timestamp.toISOString(),
			ipAddress: data.ipAddress,
			documentType: data.documentType,
			documentId: data.documentId,
		})

		// Gera assinatura HMAC-SHA256
		const signature = crypto
			.createHmac('sha256', this.secretKey)
			.update(signaturePayload)
			.digest('hex')

		// Gera ID único do certificado
		const certificateId = crypto.randomBytes(16).toString('hex')

		return {
			signature,
			documentHash: data.documentHash,
			timestamp,
			certificateId,
		}
	}

	/**
	 * Verifica se a assinatura é válida
	 */
	verifySignature(signature: string, data: SignatureData): boolean {
		const timestamp = data.timestamp ?? new Date()

		const signaturePayload = JSON.stringify({
			documentHash: data.documentHash,
			signerId: data.signerId,
			signerName: data.signerName,
			signerCRM: data.signerCRM,
			timestamp: timestamp.toISOString(),
			ipAddress: data.ipAddress,
			documentType: data.documentType,
			documentId: data.documentId,
		})

		const expectedSignature = crypto
			.createHmac('sha256', this.secretKey)
			.update(signaturePayload)
			.digest('hex')

		return crypto.timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(expectedSignature)
		)
	}

	/**
	 * Verifica integridade do documento
	 */
	verifyDocumentIntegrity(
		currentContent: Buffer | string | Record<string, any>,
		originalHash: string
	): boolean {
		const currentHash = this.generateDocumentHash(currentContent)
		return crypto.timingSafeEqual(
			Buffer.from(currentHash),
			Buffer.from(originalHash)
		)
	}

	/**
	 * Gera certificado de autenticidade
	 */
	generateCertificate(data: SignatureData, signatureResult: SignatureResult): string
	generateCertificate(data: CertificateSummary): string
	generateCertificate(data: any, signatureResult?: SignatureResult): string {
		const certificateId = signatureResult?.certificateId ?? ('certificateId' in data ? data.certificateId : '')
		const documentHash = signatureResult?.documentHash ?? data.documentHash
		const signerName = 'signerName' in data ? data.signerName : data.signedBy
		const signerCRM = 'signerCRM' in data ? data.signerCRM : ('crm' in data ? data.crm : undefined)
		const signerId = 'signerId' in data ? data.signerId : ''
		const timestamp = signatureResult?.timestamp ?? ('signedAt' in data ? data.signedAt : (data.timestamp ?? new Date()))
		const documentType = 'documentType' in data ? data.documentType : 'document'
		const documentId = 'documentId' in data ? data.documentId : ''
		const signature = signatureResult?.signature ?? ''
		const ipAddress = 'ipAddress' in data ? data.ipAddress : undefined
		const userAgent = 'userAgent' in data ? data.userAgent : undefined

		const documentTypes: Record<string, string> = {
			anamnese: 'Anamnese Médica',
			prescription: 'Prescrição Médica',
			exam: 'Solicitação de Exame',
			report: 'Relatório Médico',
		}

		return `
╔═══════════════════════════════════════════════════════════════╗
║          CERTIFICADO DE ASSINATURA ELETRÔNICA MÉDICA          ║
╚═══════════════════════════════════════════════════════════════╝

IDENTIFICAÇÃO DO CERTIFICADO
  ID: ${certificateId}

DOCUMENTO ASSINADO
  Tipo: ${documentTypes[documentType] || documentType}
  ID: ${documentId}
  Hash SHA-256: ${documentHash}

ASSINANTE
  Nome: ${signerName}
  ${signerCRM ? `CRM: ${signerCRM}` : ''}
  ID Interno: ${signerId}

DATA E HORA DA ASSINATURA
  ${timestamp.toLocaleString('pt-BR', { 
		timeZone: 'America/Sao_Paulo',
		dateStyle: 'full',
		timeStyle: 'long'
	})}

ASSINATURA DIGITAL (HMAC-SHA256)
  ${signature}

INFORMAÇÕES DE AUDITORIA
  Endereço IP: ${data.ipAddress || 'Não registrado'}
  User Agent: ${data.userAgent || 'Não registrado'}

═══════════════════════════════════════════════════════════════

Este documento foi assinado eletronicamente conforme:
• MP 2.200-2/2001 (ICP-Brasil)
• Lei 14.063/2020 (Assinatura Eletrônica)
• Resolução CFM nº 1.821/2007 (Prontuário Eletrônico)

VALIDADE JURÍDICA: Este documento possui validade jurídica como
assinatura eletrônica simples (artigo 4º da Lei 14.063/2020).

Para verificar a autenticidade deste documento, acesse:
${process.env.APP_URL || 'https://seu-sistema.com'}/api/signatures/verify/${certificateId}

═══════════════════════════════════════════════════════════════
		`.trim()
	}
}

export const signatureService = new SignatureService()
