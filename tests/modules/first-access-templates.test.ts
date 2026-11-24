import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { welcomeAdminTemplate, welcomeDoctorTemplate } from '../../src/utils/templates/welcome.templates'

const data = {
	name: 'Maria',
	email: 'maria@exemplo.com',
	setPasswordUrl: 'https://app.exemplo.com/reset-password?token=abc123',
	expiresIn: '72 horas',
}

describe('e-mails de primeiro acesso', () => {
	for (const [nome, template] of [
		['médico', welcomeDoctorTemplate],
		['admin', welcomeAdminTemplate],
	] as const) {
		it(`${nome}: leva o link de definição de senha e nenhuma senha em texto puro`, () => {
			const { html } = template(data)

			assert.ok(html.includes(data.setPasswordUrl))
			assert.ok(html.includes('Definir minha senha'))
			assert.ok(html.includes('72 horas'))
			assert.ok(!/senha tempor/i.test(html))
		})
	}

	it('sem link, o e-mail não inventa instrução de senha', () => {
		const { html } = welcomeAdminTemplate({ name: 'Maria', email: 'maria@exemplo.com' })
		assert.ok(!html.includes('Definir minha senha'))
	})
})
