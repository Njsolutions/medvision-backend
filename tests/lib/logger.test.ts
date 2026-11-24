import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Writable } from 'node:stream'
import pino from 'pino'
import { loggerOptions } from '../../src/lib/logger'

function createCapturingLogger() {
	const lines: string[] = []
	const stream = new Writable({
		write(chunk, _encoding, callback) {
			lines.push(chunk.toString())
			callback()
		},
	})

	return { log: pino({ ...loggerOptions, level: 'debug' }, stream), lines }
}

describe('logger', () => {
	it('redige credenciais e dados pessoais em objetos logados', () => {
		const { log, lines } = createCapturingLogger()

		log.info(
			{
				user: { cpf: '12345678909', email: 'maria@exemplo.com', phone: '11988776655', password: 'segredo' },
				session: { accessToken: 'tok-secreto', refreshToken: 'tok-refresh' },
			},
			'teste',
		)

		const output = lines.join('')
		for (const secret of ['12345678909', 'maria@exemplo.com', '11988776655', 'segredo', 'tok-secreto', 'tok-refresh']) {
			assert.ok(!output.includes(secret), `vazou: ${secret}`)
		}
		assert.ok(output.includes('[redacted]'))
	})

	it('o serializador de requisição remove a query string e não leva cabeçalhos', () => {
		const { log, lines } = createCapturingLogger()

		log.info(
			{
				req: {
					method: 'GET',
					url: '/v1/patients?cpf=12345678909&token=abc',
					ip: '10.0.0.1',
					headers: { authorization: 'Bearer abc', cookie: 'mv_access=xyz' },
				},
			},
			'incoming request',
		)

		const output = lines.join('')
		assert.ok(output.includes('/v1/patients'))
		assert.ok(!output.includes('12345678909'))
		assert.ok(!output.includes('token=abc'))
		assert.ok(!output.includes('mv_access'))
		assert.ok(!output.includes('Bearer'))
	})

	it('serializa erros em `err` com mensagem e stack', () => {
		const { log, lines } = createCapturingLogger()

		log.error({ err: new Error('falhou') }, 'erro de teste')

		const entry = JSON.parse(lines.join(''))
		assert.equal(entry.err.message, 'falhou')
		assert.equal(typeof entry.err.stack, 'string')
	})
})
