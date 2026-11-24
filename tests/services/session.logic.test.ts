import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	ACCESS_TTL_MS,
	REFRESH_ABSOLUTE_MAX_MS,
	REFRESH_TTL_MS,
	ROTATION_GRACE_MS,
	classifyRotatedRefreshUse,
	computeAccessExpiry,
	computeRefreshExpiry,
	generateOpaqueToken,
	hashResetCode,
	hashToken,
	isSessionUsable,
	safeEqualHex,
	shouldTouchLastUsed,
} from '../../src/services/session.logic'

const now = new Date('2026-11-24T12:00:00.000Z')

describe('tokens opacos', () => {
	it('gera tokens únicos de 43 caracteres base64url, sem dados embutidos', () => {
		const a = generateOpaqueToken()
		const b = generateOpaqueToken()
		assert.notEqual(a, b)
		assert.match(a, /^[A-Za-z0-9_-]{43}$/)
	})

	it('hash é determinístico e não revela o token', () => {
		const token = generateOpaqueToken()
		assert.equal(hashToken(token), hashToken(token))
		assert.match(hashToken(token), /^[0-9a-f]{64}$/)
		assert.ok(!hashToken(token).includes(token))
	})
})

describe('expiração', () => {
	it('acesso dura 8 horas', () => {
		assert.equal(computeAccessExpiry(now).getTime() - now.getTime(), 8 * 60 * 60 * 1000)
		assert.equal(ACCESS_TTL_MS, 8 * 60 * 60 * 1000)
	})

	it('refresh renova por 7 dias, limitado ao teto absoluto desde o login', () => {
		assert.equal(computeRefreshExpiry(now, now).getTime() - now.getTime(), REFRESH_TTL_MS)

		const createdAt = new Date(now.getTime() - (REFRESH_ABSOLUTE_MAX_MS - 60_000))
		const expiry = computeRefreshExpiry(createdAt, now)
		assert.equal(expiry.getTime(), createdAt.getTime() + REFRESH_ABSOLUTE_MAX_MS)
		assert.ok(expiry.getTime() - now.getTime() <= 60_000)
	})
})

describe('isSessionUsable', () => {
	const future = new Date(now.getTime() + 1000)
	const past = new Date(now.getTime() - 1000)

	it('aceita sessão válida de usuário ativo', () => {
		assert.equal(isSessionUsable({ revokedAt: null, expiresAt: future }, true, now), true)
	})

	it('rejeita expirada, revogada e usuário inativo', () => {
		assert.equal(isSessionUsable({ revokedAt: null, expiresAt: past }, true, now), false)
		assert.equal(isSessionUsable({ revokedAt: now, expiresAt: future }, true, now), false)
		assert.equal(isSessionUsable({ revokedAt: null, expiresAt: future }, false, now), false)
	})
})

describe('reuso de refresh rotacionado', () => {
	it('logo após a rotação é corrida entre abas (tolera)', () => {
		const rotatedAt = new Date(now.getTime() - (ROTATION_GRACE_MS - 1000))
		assert.equal(classifyRotatedRefreshUse(rotatedAt, now), 'grace')
	})

	it('depois da janela é reuso (revoga a sessão)', () => {
		const rotatedAt = new Date(now.getTime() - (ROTATION_GRACE_MS + 1000))
		assert.equal(classifyRotatedRefreshUse(rotatedAt, now), 'reuse')
		assert.equal(classifyRotatedRefreshUse(null, now), 'reuse')
	})
})

describe('lastUsedAt', () => {
	it('só regrava depois de 5 minutos', () => {
		assert.equal(shouldTouchLastUsed(new Date(now.getTime() - 60_000), now), false)
		assert.equal(shouldTouchLastUsed(new Date(now.getTime() - 6 * 60_000), now), true)
	})
})

describe('código de recuperação', () => {
	it('hash depende do segredo e ignora caixa e espaços', () => {
		assert.equal(hashResetCode('ab12cd', 'segredo'), hashResetCode(' AB12CD ', 'segredo'))
		assert.notEqual(hashResetCode('AB12CD', 'segredo'), hashResetCode('AB12CD', 'outro'))
	})

	it('safeEqualHex compara em tempo constante e rejeita tamanhos diferentes', () => {
		const a = hashResetCode('AB12CD', 's')
		assert.equal(safeEqualHex(a, hashResetCode('AB12CD', 's')), true)
		assert.equal(safeEqualHex(a, hashResetCode('AB12CE', 's')), false)
		assert.equal(safeEqualHex(a, 'abcd'), false)
		assert.equal(safeEqualHex('', ''), false)
	})
})
