interface RateLimitConfig {
	windowMs: number
	maxRequests: number
}
interface RequestLog {
	timestamp: number
	count: number
}
// Bloqueio progressivo por credencial (sem o IP): tentativas distribuídas por vários IPs também travam.
const LOCKOUT_FREE_ATTEMPTS = 5
const LOCKOUT_BASE_MS = 30 * 1000
const LOCKOUT_MAX_MS = 30 * 60 * 1000
const FAILURE_MEMORY_MS = 60 * 60 * 1000

interface FailureLog {
	count: number
	lastFailureAt: number
}

export function lockoutDurationMs(failures: number): number {
	if (failures < LOCKOUT_FREE_ATTEMPTS) return 0
	return Math.min(LOCKOUT_BASE_MS * 2 ** (failures - LOCKOUT_FREE_ATTEMPTS), LOCKOUT_MAX_MS)
}

export function createRateLimitService() {
	const store = new Map<string, RequestLog>()
	const failures = new Map<string, FailureLog>()

	function cleanup(): void {
		const now = Date.now()
		for (const [key, log] of store.entries()) {
			if (now - log.timestamp > 3600000) {
				store.delete(key)
			}
		}
		for (const [key, log] of failures.entries()) {
			if (now - log.lastFailureAt > FAILURE_MEMORY_MS) {
				failures.delete(key)
			}
		}
	}

	/** Milissegundos restantes de bloqueio para a credencial (0 = liberada). */
	function lockoutRemainingMs(key: string, now: number = Date.now()): number {
		const log = failures.get(key)
		if (!log) return 0

		if (now - log.lastFailureAt > FAILURE_MEMORY_MS) {
			failures.delete(key)
			return 0
		}

		return Math.max(lockoutDurationMs(log.count) - (now - log.lastFailureAt), 0)
	}

	function registerFailure(key: string, now: number = Date.now()): void {
		const log = failures.get(key)
		const count = log && now - log.lastFailureAt <= FAILURE_MEMORY_MS ? log.count + 1 : 1
		failures.set(key, { count, lastFailureAt: now })
	}

	function clearFailures(key: string): void {
		failures.delete(key)
	}

	function isLimited(identifier: string, config: RateLimitConfig): boolean {
		const now = Date.now()
		const log = store.get(identifier)

		if (!log || now - log.timestamp > config.windowMs) {
			store.set(identifier, { timestamp: now, count: 1 })
			return false
		}

		if (log.count >= config.maxRequests) {
			return true
		}

		log.count++
		return false
	}

	function reset(identifier: string): void {
		store.delete(identifier)
	}

	function checkGeneralLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 15 * 60 * 1000,
			maxRequests: 150,
		})
	}

	function checkLoginLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 15 * 60 * 1000,
			maxRequests: 15,
		})
	}

	function check2FALimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 10 * 60 * 1000,
			maxRequests: 15,
		})
	}

	function checkVerificationLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 60 * 60 * 1000,
			maxRequests: 15,
		})
	}

	function checkPasswordResetLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 60 * 60 * 1000,
			maxRequests: 15,
		})
	}

	function startCleanupInterval(): NodeJS.Timeout {
		return setInterval(cleanup, 5 * 60 * 1000)
	}

	return {
		isLimited,
		reset,
		lockoutRemainingMs,
		registerFailure,
		clearFailures,
		checkGeneralLimit,
		checkLoginLimit,
		check2FALimit,
		checkVerificationLimit,
		checkPasswordResetLimit,
		cleanup,
		startCleanupInterval,
	}
}

export type RateLimitService = ReturnType<typeof createRateLimitService>
export const rateLimitService = createRateLimitService()
