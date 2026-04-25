import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import fastifyJwt from '@fastify/jwt'
import { fastify } from 'fastify'
import { JwtService } from '../../src/services/jwt.service'

describe('JwtService', () => {
	it('generates and verifies access tokens', async () => {
		const app = fastify()
		await app.register(fastifyJwt, { secret: 'test-jwt-secret' })
		const service = new JwtService(app)

		const { token, refreshToken, expiresIn } = service.generateToken('user-1', 'admin', 'Admin Test')
		const decoded = service.verifyToken(token)

		assert.equal(typeof token, 'string')
		assert.equal(typeof refreshToken, 'string')
		assert.equal(expiresIn, 86400)
		assert.equal(decoded?.id, 'user-1')
		assert.equal(decoded?.role, 'admin')
		assert.equal(decoded?.name, 'Admin Test')

		await app.close()
	})
})
