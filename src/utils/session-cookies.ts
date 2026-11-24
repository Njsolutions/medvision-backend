import type { FastifyReply } from 'fastify'

export const ACCESS_COOKIE = 'mv_access'
export const REFRESH_COOKIE = 'mv_refresh'
// O refresh só trafega para as rotas de /auth (rotação e logout).
export const REFRESH_COOKIE_PATH = `/v${process.env.API_VERSION || '1'}/auth`

type SessionTokens = {
	accessToken: string
	refreshToken: string
	accessExpiresAt: Date
	refreshExpiresAt: Date
}

const isProduction = () => process.env.NODE_ENV === 'production'

export function setSessionCookies(reply: FastifyReply, tokens: SessionTokens) {
	reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
		httpOnly: true,
		secure: isProduction(),
		sameSite: 'lax',
		path: '/',
		expires: tokens.accessExpiresAt,
	})

	reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
		httpOnly: true,
		secure: isProduction(),
		sameSite: 'strict',
		path: REFRESH_COOKIE_PATH,
		expires: tokens.refreshExpiresAt,
	})
}

export function clearSessionCookies(reply: FastifyReply) {
	reply.clearCookie(ACCESS_COOKIE, { path: '/' })
	reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
}
