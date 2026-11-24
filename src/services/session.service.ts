import { db } from '@/lib/prisma'
import { realtimeService } from '@/services/realtime.service'
import {
	SESSION_RETENTION_MS,
	classifyRotatedRefreshUse,
	computeAccessExpiry,
	computeRefreshExpiry,
	generateOpaqueToken,
	hashToken,
	isSessionUsable,
	shouldTouchLastUsed,
} from '@/services/session.logic'

type SessionContext = {
	ip?: string
	userAgent?: string
}

export type IssuedSession = {
	sessionId: string
	accessToken: string
	refreshToken: string
	accessExpiresAt: Date
	refreshExpiresAt: Date
}

export type RefreshResult =
	| { ok: true; session: IssuedSession; userId: string }
	| { ok: false; reason: 'unknown' | 'revoked' | 'expired' | 'inactive' | 'grace' | 'reuse' }

const userInclude = {
	doctor: { select: { id: true, utiAccess: true } },
	patient: { select: { id: true } },
} as const

class SessionService {
	async create(userId: string, context: SessionContext = {}): Promise<IssuedSession> {
		const now = new Date()
		const accessToken = generateOpaqueToken()
		const refreshToken = generateOpaqueToken()
		const accessExpiresAt = computeAccessExpiry(now)
		const refreshExpiresAt = computeRefreshExpiry(now, now)

		const session = await db.session.create({
			data: {
				userId,
				accessHash: hashToken(accessToken),
				refreshHash: hashToken(refreshToken),
				accessExpiresAt,
				refreshExpiresAt,
				ip: context.ip,
				userAgent: context.userAgent?.slice(0, 255),
			},
			select: { id: true },
		})

		return { sessionId: session.id, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt }
	}

	/** Resolve o token de acesso em sessão + usuário. Devolve null se inválido, expirado, revogado ou usuário inativo. */
	async authenticate(accessToken: string) {
		const now = new Date()

		const session = await db.session.findUnique({
			where: { accessHash: hashToken(accessToken) },
			include: { user: { include: userInclude } },
		})

		if (!session) return null

		const usable = isSessionUsable(
			{ revokedAt: session.revokedAt, expiresAt: session.accessExpiresAt },
			session.user.active,
			now,
		)

		if (!usable) return null

		if (shouldTouchLastUsed(session.lastUsedAt, now)) {
			// Não precisa esperar nem falhar a requisição por causa disso.
			void db.session
				.update({ where: { id: session.id }, data: { lastUsedAt: now } })
				.catch(() => undefined)
		}

		return { session, user: session.user }
	}

	/** Troca o par de tokens. O refresh antigo deixa de valer; reuso fora da janela de tolerância revoga a sessão. */
	async refresh(refreshToken: string, context: SessionContext = {}): Promise<RefreshResult> {
		const now = new Date()
		const refreshHash = hashToken(refreshToken)

		const session = await db.session.findUnique({
			where: { refreshHash },
			include: { user: { select: { id: true, active: true } } },
		})

		if (!session) {
			const rotated = await db.session.findFirst({
				where: { previousRefreshHash: refreshHash },
				select: { id: true, rotatedAt: true, userId: true },
			})

			if (!rotated) return { ok: false, reason: 'unknown' }

			if (classifyRotatedRefreshUse(rotated.rotatedAt, now) === 'grace') {
				return { ok: false, reason: 'grace' }
			}

			await this.revokeById(rotated.id, 'refresh_reuse')
			return { ok: false, reason: 'reuse' }
		}

		if (session.revokedAt) return { ok: false, reason: 'revoked' }
		if (!session.user.active) return { ok: false, reason: 'inactive' }
		if (!isSessionUsable({ revokedAt: null, expiresAt: session.refreshExpiresAt }, true, now)) {
			return { ok: false, reason: 'expired' }
		}

		const accessToken = generateOpaqueToken()
		const newRefreshToken = generateOpaqueToken()
		const accessExpiresAt = computeAccessExpiry(now)
		const refreshExpiresAt = computeRefreshExpiry(session.createdAt, now)

		// Condição no refreshHash: se outra requisição girou primeiro, esta não atualiza nada.
		const updated = await db.session.updateMany({
			where: { id: session.id, refreshHash, revokedAt: null },
			data: {
				accessHash: hashToken(accessToken),
				refreshHash: hashToken(newRefreshToken),
				previousRefreshHash: refreshHash,
				rotatedAt: now,
				accessExpiresAt,
				refreshExpiresAt,
				lastUsedAt: now,
				ip: context.ip,
				userAgent: context.userAgent?.slice(0, 255),
			},
		})

		if (updated.count === 0) return { ok: false, reason: 'grace' }

		return {
			ok: true,
			userId: session.userId,
			session: {
				sessionId: session.id,
				accessToken,
				refreshToken: newRefreshToken,
				accessExpiresAt,
				refreshExpiresAt,
			},
		}
	}

	async revokeById(sessionId: string, reason: string) {
		await db.session.updateMany({
			where: { id: sessionId, revokedAt: null },
			data: { revokedAt: new Date(), revokedReason: reason },
		})
		realtimeService.closeBySession(sessionId)
	}

	/** Encerra a sessão a partir de qualquer um dos dois tokens (logout funciona com o acesso já expirado). */
	async revokeByTokens(tokens: { accessToken?: string; refreshToken?: string }, reason: string) {
		const conditions = []
		if (tokens.accessToken) conditions.push({ accessHash: hashToken(tokens.accessToken) })
		if (tokens.refreshToken) conditions.push({ refreshHash: hashToken(tokens.refreshToken) })
		if (conditions.length === 0) return null

		const session = await db.session.findFirst({ where: { OR: conditions }, select: { id: true, userId: true } })
		if (!session) return null

		await this.revokeById(session.id, reason)
		return session
	}

	async revokeAllForUser(userId: string, reason: string) {
		await db.session.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date(), revokedReason: reason },
		})
		realtimeService.closeByUser(userId)
	}

	async deleteExpired() {
		const cutoff = new Date(Date.now() - SESSION_RETENTION_MS)

		const result = await db.session.deleteMany({
			where: { OR: [{ refreshExpiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
		})

		return result.count
	}
}

export const sessionService = new SessionService()
