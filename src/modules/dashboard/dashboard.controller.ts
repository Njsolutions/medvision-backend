import { DashboardRepository } from '@/modules/dashboard/dashboard.repository'
import { DashboardQuerySchema } from '@/modules/dashboard/dashboard.schema'
import {
	buildAppointmentsByMonth,
	buildCountsByMonth,
	buildEfficiency,
	getDashboardWindow,
	percentage,
} from '@/modules/dashboard/dashboard.utils'
import type { FastifyReply, FastifyRequest } from 'fastify'

const SPECIALTY_LIMIT = 6

export class DashboardController {
	private dashboardRepository = new DashboardRepository()

	async getStats(req: FastifyRequest, res: FastifyReply) {
		try {
			if (req.user?.role !== 'master') {
				return res.status(403).send({ error: 'Permissão insuficiente para ver o dashboard' })
			}

			const query = DashboardQuerySchema.safeParse(req.query)

			if (!query.success) {
				return res.status(400).send({ error: 'Invalid request data', details: query.error })
			}

			const { months } = query.data
			const { start, end, monthKeys } = getDashboardWindow(months)

			const [
				appointmentRows,
				patientRows,
				specialtyRows,
				dayCounts,
				avgDuration,
				totalPatients,
				doctorGroups,
				utiGroups,
			] = await Promise.all([
				this.dashboardRepository.appointmentsByMonthAndStatus(start, end),
				this.dashboardRepository.patientsByMonth(start, end),
				this.dashboardRepository.appointmentsBySpecialty(start, end, SPECIALTY_LIMIT),
				this.dashboardRepository.appointmentsTodayAndYesterday(),
				this.dashboardRepository.averageDurationMinutes(start, end),
				this.dashboardRepository.countPatients(),
				this.dashboardRepository.doctorsByStatus(),
				this.dashboardRepository.utisByStatus(),
			])

			const appointmentsByMonth = buildAppointmentsByMonth(monthKeys, appointmentRows)
			const patientsByMonth = buildCountsByMonth(monthKeys, patientRows)

			const doctorCount = (status: string) => doctorGroups.find((g) => g.status === status)?._count._all ?? 0
			const utiCount = (status: string) => utiGroups.find((g) => g.status === status)?._count._all ?? 0
			const utiStatus = {
				available: utiCount('available'),
				occupied: utiCount('occupied'),
				disinfecting: utiCount('disinfecting'),
			}
			const utiTotal = utiStatus.available + utiStatus.occupied + utiStatus.disinfecting

			return res.status(200).send({
				data: {
					period: { months, start, end },
					kpis: {
						totalPatients,
						newPatientsThisMonth: patientsByMonth[patientsByMonth.length - 1]?.count ?? 0,
						newPatientsLastMonth: patientsByMonth[patientsByMonth.length - 2]?.count ?? 0,
						appointmentsToday: dayCounts.today,
						appointmentsYesterday: dayCounts.yesterday,
						activeDoctors: doctorCount('active'),
						totalDoctors: doctorGroups.reduce((sum, g) => sum + g._count._all, 0),
						utiOccupied: utiStatus.occupied,
						utiTotal,
						utiOccupancyRate: percentage(utiStatus.occupied, utiTotal),
					},
					efficiency: buildEfficiency(appointmentsByMonth, avgDuration),
					appointmentsByMonth,
					patientsByMonth,
					appointmentsBySpecialty: specialtyRows,
					utiStatus,
				},
			})
		} catch (error) {
			console.error('Error getting dashboard stats:', error)
			return res.status(500).send({ error: 'Internal server error' })
		}
	}
}
