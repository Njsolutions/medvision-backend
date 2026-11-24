const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function parseAllowedOrigins(value: string | undefined): string[] {
	return (value || '')
		.split(',')
		.map((origin) => origin.trim().replace(/\/$/, ''))
		.filter(Boolean)
}

/**
 * Defesa contra CSRF para requisições autenticadas por cookie.
 * - Método seguro: passa.
 * - `Origin` presente: precisa estar na lista de origens permitidas.
 * - `Origin` ausente: só passa se a requisição NÃO usa cookie (cliente não-navegador com Bearer).
 */
export function passesCsrfCheck(params: {
	method: string
	origin: string | undefined
	usesCookie: boolean
	allowedOrigins: readonly string[]
}): boolean {
	if (SAFE_METHODS.has(params.method.toUpperCase())) return true
	if (params.origin) return params.allowedOrigins.includes(params.origin.replace(/\/$/, ''))
	return !params.usesCookie
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
	return Boolean(origin) && allowedOrigins.includes((origin as string).replace(/\/$/, ''))
}
