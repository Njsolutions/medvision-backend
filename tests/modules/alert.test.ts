import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { maskSensitive, sanitizePath } from '../../src/modules/alert/alert.sanitize'
import { CreateAlertSchema } from '../../src/modules/alert/alert.schema'
import { buildDiscordBody } from '../../src/modules/alert/alert.service'

describe('maskSensitive', () => {
	it('mascara CPF, e-mail, números longos e tokens', () => {
		const out = maskSensitive(
			'Paciente 123.456.789-09 / 12345678909 joao@exemplo.com tel 11988776655 token aaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbb.cccccccccc',
			500,
		)
		assert.ok(!/\d{9,}/.test(out), out)
		assert.ok(!out.includes('joao@exemplo.com'), out)
		assert.ok(!out.includes('aaaaaaaaaaaaaaaaaaaa'), out)
		assert.ok(out.includes('[cpf]') && out.includes('[email]') && out.includes('[token]'))
	})

	it('trunca no limite', () => {
		assert.equal(maskSensitive('x'.repeat(1000), 50).length, 50)
	})
})

describe('sanitizePath', () => {
	it('remove query string e troca UUID por :id', () => {
		assert.equal(
			sanitizePath('/patients/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f?cpf=12345678909&x=1', 200),
			'/patients/:id',
		)
	})
})

describe('CreateAlertSchema', () => {
	it('descarta campos extras como payload e resposta da API', () => {
		const parsed = CreateAlertSchema.parse({
			title: 'Erro',
			message: 'falhou',
			severity: 'high',
			extra: { 'Payload Enviado': '{"cpf":"123"}' },
			payload: { cpf: '123' },
		})
		assert.deepEqual(Object.keys(parsed).sort(), ['message', 'severity', 'title'])
	})

	it('rejeita severidade inválida e mensagem vazia', () => {
		assert.equal(CreateAlertSchema.safeParse({ title: 'a', message: 'b', severity: 'x' }).success, false)
		assert.equal(CreateAlertSchema.safeParse({ title: 'a', message: '', severity: 'low' }).success, false)
	})
})

describe('buildDiscordBody', () => {
	it('mostra só id e papel do usuário, sem e-mail nem nome', () => {
		const body = buildDiscordBody(
			{ title: 'Erro', message: 'x', severity: 'high', screen: '/appointments/123' },
			{ id: 'user-1', role: 'doctor' },
		)
		const text = JSON.stringify(body)
		assert.ok(text.includes('doctor:user-1'))
		assert.ok(!text.includes('@'))
	})

	it('marca usuário anônimo quando não há token', () => {
		const text = JSON.stringify(buildDiscordBody({ title: 'Erro', message: 'x', severity: 'low' }))
		assert.ok(text.includes('anônimo'))
	})
})
