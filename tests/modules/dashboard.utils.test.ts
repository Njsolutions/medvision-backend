import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	buildAppointmentsByMonth,
	buildCountsByMonth,
	buildEfficiency,
	getDashboardWindow,
	percentage,
} from '../../src/modules/dashboard/dashboard.utils'

describe('dashboard.utils', () => {
	it('builds the month window in BRT, crossing the year boundary', () => {
		const { start, end, monthKeys } = getDashboardWindow(3, new Date('2026-01-15T12:00:00Z'))

		assert.deepEqual(monthKeys, ['2025-11', '2025-12', '2026-01'])
		assert.equal(start.toISOString(), '2025-11-01T03:00:00.000Z')
		assert.equal(end.toISOString(), '2026-02-01T03:00:00.000Z')
	})

	it('uses the BRT month when UTC already rolled over', () => {
		// 01/12 01:00 UTC ainda é 30/11 22:00 em Brasília
		const { monthKeys } = getDashboardWindow(2, new Date('2026-12-01T01:00:00Z'))
		assert.deepEqual(monthKeys, ['2026-10', '2026-11'])
	})

	it('computes percentage with one decimal and null for empty totals', () => {
		assert.equal(percentage(1, 3), 33.3)
		assert.equal(percentage(0, 0), null)
	})

	it('fills empty months and splits statuses', () => {
		const points = buildAppointmentsByMonth(['2026-09', '2026-10'], [
			{ month: '2026-10', status: 'completed', count: 6 },
			{ month: '2026-10', status: 'cancelled', count: 2 },
			{ month: '2026-10', status: 'noShow', count: 2 },
			{ month: '2026-10', status: 'scheduled', count: 3 },
			{ month: '2026-10', status: 'inProgress', count: 1 },
			{ month: '2026-01', status: 'completed', count: 99 },
		])

		assert.deepEqual(points[0], {
			month: '2026-09', completed: 0, upcoming: 0, cancelled: 0, noShow: 0, total: 0, completionRate: null,
		})
		assert.equal(points[1].upcoming, 4)
		assert.equal(points[1].total, 14)
		assert.equal(points[1].completionRate, 60)
	})

	it('fills patient counts and aggregates efficiency', () => {
		assert.deepEqual(buildCountsByMonth(['a', 'b'], [{ month: 'b', count: 5 }]), [
			{ month: 'a', count: 0 },
			{ month: 'b', count: 5 },
		])

		const points = buildAppointmentsByMonth(['2026-10'], [
			{ month: '2026-10', status: 'completed', count: 8 },
			{ month: '2026-10', status: 'cancelled', count: 1 },
			{ month: '2026-10', status: 'noShow', count: 1 },
		])
		assert.deepEqual(buildEfficiency(points, 24.6), {
			finishedTotal: 10,
			completionRate: 80,
			cancellationRate: 10,
			noShowRate: 10,
			avgDurationMinutes: 25,
		})
		assert.equal(buildEfficiency([], null).completionRate, null)
	})
})
