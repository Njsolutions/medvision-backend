export type AppointmentStatusKey = 'scheduled' | 'inProgress' | 'completed' | 'cancelled' | 'noShow'

export interface MonthStatusRow {
	month: string
	status: AppointmentStatusKey
	count: number
}

export interface MonthCountRow {
	month: string
	count: number
}

export interface AppointmentMonthPoint {
	month: string
	completed: number
	upcoming: number
	cancelled: number
	noShow: number
	total: number
	completionRate: number | null
}

// Brasil não tem horário de verão desde 2019: America/Sao_Paulo é UTC-3 fixo.
const BRT_OFFSET_HOURS = 3

export function getDashboardWindow(months: number, now = new Date()) {
	const brtNow = new Date(now.getTime() - BRT_OFFSET_HOURS * 60 * 60 * 1000)
	const year = brtNow.getUTCFullYear()
	const month = brtNow.getUTCMonth()

	const start = new Date(Date.UTC(year, month - (months - 1), 1, BRT_OFFSET_HOURS))
	const end = new Date(Date.UTC(year, month + 1, 1, BRT_OFFSET_HOURS))

	const monthKeys: string[] = []
	for (let i = months - 1; i >= 0; i--) {
		const d = new Date(Date.UTC(year, month - i, 1))
		monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
	}

	return { start, end, monthKeys }
}

export function percentage(part: number, total: number): number | null {
	if (total <= 0) return null
	return Math.round((part / total) * 1000) / 10
}

export function buildAppointmentsByMonth(monthKeys: string[], rows: MonthStatusRow[]): AppointmentMonthPoint[] {
	const byMonth = new Map<string, AppointmentMonthPoint>(
		monthKeys.map((month) => [
			month,
			{ month, completed: 0, upcoming: 0, cancelled: 0, noShow: 0, total: 0, completionRate: null },
		]),
	)

	for (const row of rows) {
		const point = byMonth.get(row.month)
		if (!point) continue

		if (row.status === 'completed') point.completed += row.count
		else if (row.status === 'cancelled') point.cancelled += row.count
		else if (row.status === 'noShow') point.noShow += row.count
		else point.upcoming += row.count

		point.total += row.count
	}

	return monthKeys.map((month) => {
		const point = byMonth.get(month) as AppointmentMonthPoint
		point.completionRate = percentage(point.completed, point.completed + point.cancelled + point.noShow)
		return point
	})
}

export function buildCountsByMonth(monthKeys: string[], rows: MonthCountRow[]): MonthCountRow[] {
	const byMonth = new Map(rows.map((row) => [row.month, row.count]))
	return monthKeys.map((month) => ({ month, count: byMonth.get(month) ?? 0 }))
}

// Eficácia = o que aconteceu com as consultas que já tiveram desfecho (concluída, cancelada ou falta).
export function buildEfficiency(points: AppointmentMonthPoint[], avgDurationMinutes: number | null) {
	const completed = points.reduce((sum, p) => sum + p.completed, 0)
	const cancelled = points.reduce((sum, p) => sum + p.cancelled, 0)
	const noShow = points.reduce((sum, p) => sum + p.noShow, 0)
	const finishedTotal = completed + cancelled + noShow

	return {
		finishedTotal,
		completionRate: percentage(completed, finishedTotal),
		cancellationRate: percentage(cancelled, finishedTotal),
		noShowRate: percentage(noShow, finishedTotal),
		avgDurationMinutes: avgDurationMinutes === null ? null : Math.round(avgDurationMinutes),
	}
}
