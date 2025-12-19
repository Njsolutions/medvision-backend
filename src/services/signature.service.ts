import crypto from 'node:crypto'

export interface SignatureData {
	documentHash: string
	signerId: string
	signerName: string
	signerCRM?: string
	timestamp: Date
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
		// Cria string com todos os dados relevantes
		const signaturePayload = JSON.stringify({
			documentHash: data.documentHash,
			signerId: data.signerId,
			signerName: data.signerName,
			signerCRM: data.signerCRM,
			timestamp: data.timestamp.toISOString(),
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
			timestamp: data.timestamp,
			certificateId,
		}
	}

	/**
	 * Verifica se a assinatura é válida
	 */
	verifySignature(signature: string, data: SignatureData): boolean {
		const signaturePayload = JSON.stringify({
			documentHash: data.documentHash,
			signerId: data.signerId,
			signerName: data.signerName,
			signerCRM: data.signerCRM,
			timestamp: data.timestamp.toISOString(),
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
	generateCertificate(data: SignatureData, signatureResult: SignatureResult): string {
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
  ID: ${signatureResult.certificateId}

DOCUMENTO ASSINADO
  Tipo: ${documentTypes[data.documentType] || data.documentType}
  ID: ${data.documentId}
  Hash SHA-256: ${signatureResult.documentHash}

ASSINANTE
  Nome: ${data.signerName}
  ${data.signerCRM ? `CRM: ${data.signerCRM}` : ''}
  ID Interno: ${data.signerId}

DATA E HORA DA ASSINATURA
  ${signatureResult.timestamp.toLocaleString('pt-BR', { 
		timeZone: 'America/Sao_Paulo',
		dateStyle: 'full',
		timeStyle: 'long'
	})}

ASSINATURA DIGITAL (HMAC-SHA256)
  ${signatureResult.signature}

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
${process.env.APP_URL || 'https://seu-sistema.com'}/api/signatures/verify/${signatureResult.certificateId}

═══════════════════════════════════════════════════════════════
		`.trim()
	}
}

export const signatureService = new SignatureService()
