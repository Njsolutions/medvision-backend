interface RateLimitConfig {
	windowMs: number
	maxRequests: number
}

interface RequestLog {
	timestamp: number
	count: number
}

export function createRateLimitService() {
	const store = new Map<string, RequestLog>()

	function cleanup(): void {
		const now = Date.now()
		for (const [key, log] of store.entries()) {
			if (now - log.timestamp > 3600000) {
				store.delete(key)
			}
		}
	}

	function isLimited(identifier: string, config: RateLimitConfig): boolean {
		const now = Date.now()
		const log = store.get(identifier)

		if (!log || now - log.timestamp > config.windowMs) {
			store.set(identifier, { timestamp: now, count: 1 })
			return false
		}

		log.count++

		return log.count > config.maxRequests
	}

	function reset(identifier: string): void {
		store.delete(identifier)
	}

	function checkGeneralLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 15 * 60 * 1000,
			maxRequests: 100,
		})
	}

	function checkLoginLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 15 * 60 * 1000,
			maxRequests: 5,
		})
	}

	function check2FALimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 10 * 60 * 1000,
			maxRequests: 3,
		})
	}

	function checkVerificationLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 60 * 60 * 1000,
			maxRequests: 3,
		})
	}

	function checkPasswordResetLimit(identifier: string): boolean {
		return isLimited(identifier, {
			windowMs: 60 * 60 * 1000,
			maxRequests: 3,
		})
	}

	function startCleanupInterval(): NodeJS.Timeout {
		return setInterval(cleanup, 5 * 60 * 1000)
	}

	return {
		isLimited,
		reset,
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
