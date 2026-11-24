import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRateLimitService } from '../../src/services/ratelimit.service'

describe('RateLimitService', () => {
	it('limits after the configured number of login attempts', () => {
		const service = createRateLimitService()
		const identifier = '127.0.0.1:test@example.com'

		for (let attempt = 1; attempt <= 15; attempt++) {
			assert.equal(service.checkLoginLimit(identifier), false, `tentativa ${attempt}`)
		}

		assert.equal(service.checkLoginLimit(identifier), true)
	})

	it('não bloqueia até 4 falhas e passa a bloquear com tempo crescente', () => {
		const service = createRateLimitService()
		const now = 1_000_000

		for (let i = 0; i < 4; i++) service.registerFailure('cpf:1', now)
		assert.equal(service.lockoutRemainingMs('cpf:1', now), 0)

		service.registerFailure('cpf:1', now) // 5ª falha
		assert.equal(service.lockoutRemainingMs('cpf:1', now), 30_000)

		service.registerFailure('cpf:1', now) // 6ª falha
		assert.equal(service.lockoutRemainingMs('cpf:1', now), 60_000)
	})

	it('o bloqueio expira com o tempo e limita no teto de 30 minutos', () => {
		const service = createRateLimitService()
		const now = 2_000_000

		for (let i = 0; i < 5; i++) service.registerFailure('cpf:2', now)
		assert.equal(service.lockoutRemainingMs('cpf:2', now + 31_000), 0)

		for (let i = 0; i < 20; i++) service.registerFailure('cpf:3', now)
		assert.equal(service.lockoutRemainingMs('cpf:3', now), 30 * 60 * 1000)
	})

	it('login correto limpa as falhas e cada credencial tem contagem própria', () => {
		const service = createRateLimitService()
		const now = 3_000_000

		for (let i = 0; i < 6; i++) service.registerFailure('cpf:4', now)
		assert.ok(service.lockoutRemainingMs('cpf:4', now) > 0)
		assert.equal(service.lockoutRemainingMs('cpf:5', now), 0)

		service.clearFailures('cpf:4')
		assert.equal(service.lockoutRemainingMs('cpf:4', now), 0)
	})
})
