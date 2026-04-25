import { createHash, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { storageService } from '../src/services/storage.service'

async function bodyToBuffer(body: unknown): Promise<Buffer> {
	if (Buffer.isBuffer(body)) {
		return body
	}

	if (body instanceof Uint8Array) {
		return Buffer.from(body)
	}

	if (body instanceof Readable) {
		const chunks: Buffer[] = []

		for await (const chunk of body) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}

		return Buffer.concat(chunks)
	}

	if (
		body &&
		typeof body === 'object' &&
		'transformToByteArray' in body &&
		typeof body.transformToByteArray === 'function'
	) {
		return Buffer.from(await body.transformToByteArray())
	}

	throw new Error(`Unsupported download body type: ${typeof body}`)
}

function sha256(buffer: Buffer): string {
	return createHash('sha256').update(buffer).digest('hex')
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
	if (actual !== expected) {
		throw new Error(`${label} mismatch. Expected ${expected}, received ${actual}`)
	}
}

async function main() {
	const key = `diagnostics/r2-transfer-${Date.now()}-${randomUUID()}.txt`
	const contentType = 'text/plain'
	const original = Buffer.from(
		[
			'MedVision R2 transfer validation',
			`timestamp=${new Date().toISOString()}`,
			`id=${randomUUID()}`,
		].join('\n'),
		'utf8',
	)
	const originalHash = sha256(original)

	console.log(`Uploading temporary object: ${key}`)
	await storageService.uploadFile(original, key, contentType)

	try {
		console.log('Downloading object through SDK')
		const downloaded = await storageService.downloadFile(key)
		const downloadedBuffer = await bodyToBuffer(downloaded.body)

		assertEqual('SDK download byte length', downloadedBuffer.length, original.length)
		assertEqual('SDK download SHA-256', sha256(downloadedBuffer), originalHash)
		assertEqual('SDK download content type', downloaded.contentType, contentType)

		console.log('Downloading object through signed URL')
		const signedUrl = await storageService.getSignedUrl(key, 120)
		const response = await fetch(signedUrl)

		if (!response.ok) {
			throw new Error(`Signed URL download failed: ${response.status} ${response.statusText}`)
		}

		const signedUrlBuffer = Buffer.from(await response.arrayBuffer())
		assertEqual('Signed URL byte length', signedUrlBuffer.length, original.length)
		assertEqual('Signed URL SHA-256', sha256(signedUrlBuffer), originalHash)

		console.log('R2 upload/download validation passed')
		console.log(`bytes=${original.length}`)
		console.log(`sha256=${originalHash}`)
		console.log(`contentType=${downloaded.contentType}`)
	} finally {
		console.log('Deleting temporary object')
		await storageService.deleteFile(key)
	}
}

main().catch((error) => {
	console.error('R2 upload/download validation failed')
	console.error(error)
	process.exit(1)
})
