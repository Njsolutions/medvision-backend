import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRateLimitService } from '../../src/services/ratelimit.service'

describe('RateLimitService', () => {
	it('limits after the configured number of login attempts', () => {
		const service = createRateLimitService()
		const identifier = '127.0.0.1:test@example.com'

		assert.equal(service.checkLoginLimit(identifier), false)
		assert.equal(service.checkLoginLimit(identifier), false)
		assert.equal(service.checkLoginLimit(identifier), false)
		assert.equal(service.checkLoginLimit(identifier), false)
		assert.equal(service.checkLoginLimit(identifier), false)
		assert.equal(service.checkLoginLimit(identifier), true)
	})
})
