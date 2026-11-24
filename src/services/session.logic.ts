import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Regras puras de sessão (sem banco), para serem testáveis isoladamente.

export const ACCESS_TTL_MS = 8 * 60 * 60 * 1000 // 8 horas
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias, renovado a cada rotação
export const REFRESH_ABSOLUTE_MAX_MS = 30 * 24 * 60 * 60 * 1000 // teto absoluto desde o login
export const ROTATION_GRACE_MS = 10 * 1000 // tolera duas abas girando o mesmo refresh ao mesmo tempo
export const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000
export const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000 // quanto tempo manter sessão expirada/revogada

export function generateOpaqueToken(): string {
	return randomBytes(32).toString('base64url')
}

// SHA-256 basta: o token tem 256 bits de entropia, então não há o que forçar por dicionário.
export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex')
}

export function computeAccessExpiry(now: Date): Date {
	return new Date(now.getTime() + ACCESS_TTL_MS)
}

export function computeRefreshExpiry(sessionCreatedAt: Date, now: Date): Date {
	const sliding = now.getTime() + REFRESH_TTL_MS
	const absolute = sessionCreatedAt.getTime() + REFRESH_ABSOLUTE_MAX_MS
	return new Date(Math.min(sliding, absolute))
}

type SessionState = {
	revokedAt: Date | null
	expiresAt: Date
}

export function isSessionUsable(session: SessionState, userActive: boolean, now: Date): boolean {
	if (session.revokedAt) return false
	if (!userActive) return false
	return session.expiresAt.getTime() > now.getTime()
}

/**
 * Um refresh já rotacionado reapareceu. Logo após a rotação é uma corrida legítima entre abas;
 * depois disso indica token roubado e a sessão deve ser revogada.
 */
export function classifyRotatedRefreshUse(rotatedAt: Date | null, now: Date): 'grace' | 'reuse' {
	if (rotatedAt && now.getTime() - rotatedAt.getTime() < ROTATION_GRACE_MS) return 'grace'
	return 'reuse'
}

export function shouldTouchLastUsed(lastUsedAt: Date, now: Date): boolean {
	return now.getTime() - lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS
}

// ----- Recuperação de senha -----

export const RESET_CODE_TTL_MS = 15 * 60 * 1000
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000
export const RESET_CODE_MAX_ATTEMPTS = 5

// HMAC com segredo do servidor: um código de 6 caracteres não resiste a força bruta se o banco vazar só com SHA-256.
export function hashResetCode(code: string, secret: string): string {
	return createHmac('sha256', secret).update(code.trim().toUpperCase()).digest('hex')
}

export function safeEqualHex(a: string, b: string): boolean {
	const bufferA = Buffer.from(a, 'hex')
	const bufferB = Buffer.from(b, 'hex')
	if (bufferA.length === 0 || bufferA.length !== bufferB.length) return false
	return timingSafeEqual(bufferA, bufferB)
}
