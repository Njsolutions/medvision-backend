import { logger } from '@/lib/logger'
import { maskSensitive, sanitizePath } from '@/modules/alert/alert.sanitize'
import type { CreateAlertInput } from '@/modules/alert/alert.schema'

const SEVERITY_CONFIG: Record<CreateAlertInput['severity'], { color: number; icon: string }> = {
	low: { color: 0xffd700, icon: '⚠️' },
	medium: { color: 0xff8c00, icon: '🟠' },
	high: { color: 0xff0000, icon: '🔴' },
	critical: { color: 0x8b0000, icon: '💀' },
}

type AlertUser = { id: string; role: string }

export function buildDiscordBody(alert: CreateAlertInput, user?: AlertUser) {
	const { color, icon } = SEVERITY_CONFIG[alert.severity]
	const fields: { name: string; value: string; inline: boolean }[] = []
	const add = (name: string, value: string | undefined, inline: boolean) => {
		if (value) fields.push({ name, value: `\`${value}\``, inline })
	}

	add('📍 Tela', alert.screen ? sanitizePath(alert.screen, 200) : undefined, true)
	add('⚡ Ação', alert.action ? maskSensitive(alert.action, 100) : undefined, true)
	add('👤 Usuário', user ? `${user.role}:${user.id}` : 'anônimo', true)
	add('🔗 Endpoint', alert.endpoint ? sanitizePath(alert.endpoint, 200) : undefined, false)
	add('📊 Status', alert.statusCode ? String(alert.statusCode) : undefined, true)

	return {
		embeds: [
			{
				title: `${icon} ${maskSensitive(alert.title, 100)}`,
				description: `\`\`\`\n${maskSensitive(alert.message, 500).replace(/`/g, "'")}\n\`\`\``,
				color,
				fields,
				timestamp: new Date().toISOString(),
			},
		],
	}
}

class AlertService {
	async send(alert: CreateAlertInput, user?: AlertUser): Promise<void> {
		const webhookUrl = process.env.DISCORD_WEBHOOK_URL

		if (!webhookUrl) return

		try {
			await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildDiscordBody(alert, user)),
				signal: AbortSignal.timeout(3000),
			})
		} catch (error) {
			// Falha do webhook nunca pode derrubar a requisição nem gerar novo alerta.
			logger.error({ err: error }, 'Falha ao enviar alerta')
		}
	}
}

export const alertService = new AlertService()
