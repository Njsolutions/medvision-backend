import { db } from '@/lib/prisma'
import type { MonthCountRow, MonthStatusRow } from '@/modules/dashboard/dashboard.utils'

const TZ = 'America/Sao_Paulo'

export class DashboardRepository {
	appointmentsByMonthAndStatus(start: Date, end: Date) {
		return db.$queryRaw<MonthStatusRow[]>`
			SELECT
				to_char(date_trunc('month', "appointmentDate" AT TIME ZONE ${TZ}), 'YYYY-MM') AS month,
				status::text AS status,
				COUNT(*)::int AS count
			FROM appointments
			WHERE "appointmentDate" >= ${start} AND "appointmentDate" < ${end}
			GROUP BY 1, 2
		`
	}

	patientsByMonth(start: Date, end: Date) {
		return db.$queryRaw<MonthCountRow[]>`
			SELECT
				to_char(date_trunc('month', "createdAt" AT TIME ZONE ${TZ}), 'YYYY-MM') AS month,
				COUNT(*)::int AS count
			FROM patients
			WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
			GROUP BY 1
		`
	}

	appointmentsBySpecialty(start: Date, end: Date, limit: number) {
		return db.$queryRaw<{ specialty: string; count: number }[]>`
			SELECT d.specialty AS specialty, COUNT(*)::int AS count
			FROM appointments a
			JOIN doctors d ON d.id = a."doctorId"
			WHERE a."appointmentDate" >= ${start} AND a."appointmentDate" < ${end}
			GROUP BY d.specialty
			ORDER BY count DESC, d.specialty ASC
			LIMIT ${limit}
		`
	}

	async appointmentsTodayAndYesterday() {
		const rows = await db.$queryRaw<{ today: number; yesterday: number }[]>`
			SELECT
				COUNT(*) FILTER (WHERE d = today)::int AS today,
				COUNT(*) FILTER (WHERE d = today - 1)::int AS yesterday
			FROM (
				SELECT
					("appointmentDate" AT TIME ZONE ${TZ})::date AS d,
					(now() AT TIME ZONE ${TZ})::date AS today
				FROM appointments
				WHERE "appointmentDate" >= now() - interval '2 days'
					AND "appointmentDate" < now() + interval '2 days'
			) t
		`
		return rows[0] ?? { today: 0, yesterday: 0 }
	}

	async averageDurationMinutes(start: Date, end: Date) {
		const result = await db.appointment.aggregate({
			_avg: { durationMinutes: true },
			where: {
				status: 'completed',
				durationMinutes: { not: null },
				appointmentDate: { gte: start, lt: end },
			},
		})
		return result._avg.durationMinutes
	}

	countPatients() {
		return db.patient.count()
	}

	doctorsByStatus() {
		return db.doctor.groupBy({ by: ['status'], _count: { _all: true } })
	}

	utisByStatus() {
		return db.uti.groupBy({ by: ['status'], _count: { _all: true } })
	}
}
