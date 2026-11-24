// Identidade visual do Amparo para e-mails (espelha as variáveis do frontend).
export const BRAND = {
	name: 'Amparo Online',
	primary: '#5C65C0',
	primaryDark: '#4A52A3',
	primarySoft: '#ECEDF8',
	gold: '#B8975F',
	ink: '#111111',
	text: '#444444',
	muted: '#6B6B6B',
	border: '#E5E5E5',
	background: '#F7F7F7',
	font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
} as const

// Clientes de e-mail exigem URL pública absoluta. Logo servida pelo frontend (public/).
export const getLogoUrl = (): string => {
	const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '')
	return `${baseUrl}/logo_192.png`
}
