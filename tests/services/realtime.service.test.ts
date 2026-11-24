import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { matchesAudience, realtimeService } from '../../src/services/realtime.service'

type TestClient = Parameters<typeof realtimeService.register>[0]

function makeClient(overrides: Partial<TestClient> & { role: string; userId: string }) {
	const received: Array<{ type: string; data?: unknown }> = []
	const client: TestClient = {
		socket: {
			readyState: 1,
			send: (payload: string) => received.push(JSON.parse(payload)),
			close: () => undefined,
		},
		...overrides,
	}
	return { client, received }
}

describe('matchesAudience', () => {
	const audience = { patientId: 'patient-A', doctorIds: ['doctor-1'] }

	it('master e admin sempre recebem', () => {
		assert.equal(matchesAudience(makeClient({ userId: 'm', role: 'master' }).client, audience), true)
		assert.equal(matchesAudience(makeClient({ userId: 'a', role: 'admin' }).client, audience), true)
	})

	it('paciente dono recebe; outro paciente não', () => {
		assert.equal(matchesAudience(makeClient({ userId: 'p1', role: 'patient', patientId: 'patient-A' }).client, audience), true)
		assert.equal(matchesAudience(makeClient({ userId: 'p2', role: 'patient', patientId: 'patient-B' }).client, audience), false)
	})

	it('paciente sem vínculo não recebe evento sem patientId', () => {
		const client = makeClient({ userId: 'p', role: 'patient', patientId: null }).client
		assert.equal(matchesAudience(client, {}), false)
		assert.equal(matchesAudience(client, { patientId: null }), false)
	})

	it('médico envolvido recebe; outro médico não', () => {
		assert.equal(matchesAudience(makeClient({ userId: 'd1', role: 'doctor', doctorId: 'doctor-1' }).client, audience), true)
		assert.equal(matchesAudience(makeClient({ userId: 'd2', role: 'doctor', doctorId: 'doctor-2' }).client, audience), false)
	})

	it('evento de UTI vai só para médico com utiAccess', () => {
		const uti = { utiAccess: true }
		assert.equal(matchesAudience(makeClient({ userId: 'd1', role: 'doctor', doctorId: 'doctor-1', utiAccess: true }).client, uti), true)
		assert.equal(matchesAudience(makeClient({ userId: 'd2', role: 'doctor', doctorId: 'doctor-2', utiAccess: false }).client, uti), false)
		assert.equal(matchesAudience(makeClient({ userId: 'p', role: 'patient', patientId: 'patient-A' }).client, uti), false)
	})

	it('papel desconhecido não recebe', () => {
		assert.equal(matchesAudience(makeClient({ userId: 'x', role: 'visitor' }).client, audience), false)
	})
})

describe('realtimeService.publish', () => {
	it('entrega só à audiência e respeita a assinatura do cliente', () => {
		const owner = makeClient({ userId: 'p1', role: 'patient', patientId: 'patient-A' })
		const other = makeClient({ userId: 'p2', role: 'patient', patientId: 'patient-B' })
		const doctor = makeClient({ userId: 'd1', role: 'doctor', doctorId: 'doctor-1' })
		const admin = makeClient({ userId: 'a', role: 'admin' })
		const unsubscribed = makeClient({
			userId: 'p3',
			role: 'patient',
			patientId: 'patient-A',
			subscriptions: new Set(['other.event']),
		})

		const unregister = [owner, other, doctor, admin, unsubscribed].map((c) => realtimeService.register(c.client))

		realtimeService.publish(
			{ type: 'prescription.created', data: { patientId: 'patient-A' } },
			{ patientId: 'patient-A', doctorIds: ['doctor-1'] },
		)

		for (const stop of unregister) stop()

		assert.equal(owner.received.length, 1)
		assert.equal(doctor.received.length, 1)
		assert.equal(admin.received.length, 1)
		assert.equal(other.received.length, 0, 'outro paciente não pode receber')
		assert.equal(unsubscribed.received.length, 0)
	})
})
