import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canCreateRole, type UserRole } from '../../src/utils/security/role-policy'

const ALL_ROLES: UserRole[] = ['master', 'admin', 'doctor', 'patient']

describe('canCreateRole', () => {
	it('master cria todos os papéis', () => {
		for (const role of ALL_ROLES) {
			assert.equal(canCreateRole('master', role), true, `master -> ${role}`)
		}
	})

	it('admin cria só doctor e patient', () => {
		assert.equal(canCreateRole('admin', 'doctor'), true)
		assert.equal(canCreateRole('admin', 'patient'), true)
		assert.equal(canCreateRole('admin', 'admin'), false)
		assert.equal(canCreateRole('admin', 'master'), false)
	})

	it('doctor e patient não cadastram ninguém', () => {
		for (const creator of ['doctor', 'patient'] as const) {
			for (const role of ALL_ROLES) {
				assert.equal(canCreateRole(creator, role), false, `${creator} -> ${role}`)
			}
		}
	})

	it('sem papel de quem chama, nega', () => {
		for (const role of ALL_ROLES) {
			assert.equal(canCreateRole(undefined, role), false)
		}
	})
})
