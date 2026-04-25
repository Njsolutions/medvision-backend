import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('SignatureService', () => {
	it('hashes, signs, and verifies document content', async () => {
		process.env.SIGNATURE_SECRET_KEY = 'test-signature-secret'
		const { SignatureService } = await import('../../src/services/signature.service')
		const service = new SignatureService()
		const document = { id: 'doc-1', content: 'clinical note' }
		const documentHash = service.generateDocumentHash(document)
		const signatureData = {
			documentHash,
			signerId: 'doctor-1',
			signerName: 'Dra Teste',
			signerCRM: 'CRM123',
			timestamp: new Date('2026-01-01T10:00:00.000Z'),
			ipAddress: '127.0.0.1',
			userAgent: 'node-test',
			documentType: 'anamnese',
			documentId: 'doc-1',
		}

		const result = service.signDocument(signatureData)

		assert.equal(result.documentHash, documentHash)
		assert.equal(service.verifySignature(result.signature, signatureData), true)
		assert.equal(service.verifyDocumentIntegrity(document, documentHash), true)
		assert.equal(service.verifyDocumentIntegrity({ ...document, content: 'changed' }, documentHash), false)
	})
})
