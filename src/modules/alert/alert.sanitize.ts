const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const TOKEN_PATTERN = /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const LONG_DIGITS_PATTERN = /\b\d{9,}\b/g
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/**
 * Remove o que não deve sair da API para um canal de terceiros:
 * CPF, e-mail, telefones/números longos e tokens. Trunca no limite informado.
 */
export function maskSensitive(value: string, maxLength: number): string {
	return value
		.replace(CONTROL_CHARS, '')
		.replace(TOKEN_PATTERN, '[token]')
		.replace(EMAIL_PATTERN, '[email]')
		.replace(CPF_PATTERN, '[cpf]')
		.replace(LONG_DIGITS_PATTERN, '[número]')
		.slice(0, maxLength)
}

/** Caminho sem query string (pode ter CPF, tokens, nomes) e com UUIDs trocados por `:id`. */
export function sanitizePath(value: string, maxLength: number): string {
	const withoutQuery = value.split(/[?#]/)[0] ?? ''
	return maskSensitive(withoutQuery.replace(UUID_PATTERN, ':id'), maxLength)
}
