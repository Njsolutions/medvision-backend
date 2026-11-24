import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAllowedOrigin, parseAllowedOrigins, passesCsrfCheck } from '../../src/utils/security/origin'

const allowed = parseAllowedOrigins('https://app.exemplo.com, http://localhost:5173/')

describe('parseAllowedOrigins', () => {
	it('separa por vírgula, remove espaços e barra final', () => {
		assert.deepEqual(allowed, ['https://app.exemplo.com', 'http://localhost:5173'])
		assert.deepEqual(parseAllowedOrigins(undefined), [])
	})
})

describe('passesCsrfCheck', () => {
	it('métodos seguros passam sempre', () => {
		assert.equal(passesCsrfCheck({ method: 'GET', origin: 'https://evil.com', usesCookie: true, allowedOrigins: allowed }), true)
	})

	it('POST com cookie e Origin permitido passa', () => {
		assert.equal(passesCsrfCheck({ method: 'POST', origin: 'https://app.exemplo.com', usesCookie: true, allowedOrigins: allowed }), true)
	})

	it('POST com cookie e Origin de outro site é bloqueado', () => {
		assert.equal(passesCsrfCheck({ method: 'POST', origin: 'https://evil.com', usesCookie: true, allowedOrigins: allowed }), false)
	})

	it('POST com cookie e sem Origin é bloqueado', () => {
		assert.equal(passesCsrfCheck({ method: 'DELETE', origin: undefined, usesCookie: true, allowedOrigins: allowed }), false)
	})

	it('POST com Bearer e sem Origin (cliente não-navegador) passa', () => {
		assert.equal(passesCsrfCheck({ method: 'POST', origin: undefined, usesCookie: false, allowedOrigins: allowed }), true)
	})

	it('sem origens configuradas, qualquer Origin é bloqueado', () => {
		assert.equal(passesCsrfCheck({ method: 'POST', origin: 'https://app.exemplo.com', usesCookie: true, allowedOrigins: [] }), false)
	})
})

describe('isAllowedOrigin', () => {
	it('exige Origin presente e na lista', () => {
		assert.equal(isAllowedOrigin('https://app.exemplo.com', allowed), true)
		assert.equal(isAllowedOrigin('https://evil.com', allowed), false)
		assert.equal(isAllowedOrigin(undefined, allowed), false)
	})
})
