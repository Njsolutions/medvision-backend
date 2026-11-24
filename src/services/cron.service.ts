import cron from 'node-cron'
import { db } from '@/lib/prisma'
import { createDailyService } from './daily.service'
import { sessionService } from './session.service'
import { logger } from '@/lib/logger'

export class CronService {
	private dailyService = createDailyService()

	/**
	 * Inicia o cron job para cancelar consultas expiradas
	 * Executa a cada 1 hora
	 */
	startExpiredAppointmentsCheck() {
		// Executa imediatamente ao iniciar para processar consultas já expiradas
		logger.info('Executando verificação inicial de consultas expiradas')
		this.cancelExpiredAppointments()

		// Executa a cada 1 hora (minuto 0 de cada hora)
		cron.schedule('0 * * * *', async () => {
			await this.cancelExpiredAppointments()
		})

		logger.info('Cron job de cancelamento de consultas expiradas iniciado (a cada 1 hora)')
	}

	/**
	 * Cancela consultas com mais de 1 hora de atraso
	 * Regra: Se a consulta foi agendada há mais de 1 hora e ainda está com status 'scheduled', será cancelada
	 */
	private async cancelExpiredAppointments() {
		try {
			const now = new Date()
			// Considera expiradas apenas consultas com mais de 1 hora de atraso
			const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000) // 1 hora atrás

			// Só consultas 'scheduled' agendadas antes do corte. Outros status são ignorados.
			const expiredAppointments = await db.appointment.findMany({
				where: {
					status: 'scheduled',
					appointmentDate: {
						lt: cutoffTime,
					},
				},
				select: {
					id: true,
					status: true,
					notes: true,
					roomName: true,
					appointmentDate: true,
				},
			})

			if (expiredAppointments.length === 0) {
				logger.debug('Nenhuma consulta expirada para cancelar')
				return
			}

			let cancelled = 0

			for (const appointment of expiredAppointments) {
				try {
					// Verificação adicional de segurança: ignorar se não for 'scheduled'
					if (appointment.status !== 'scheduled') {
						continue
					}

					// 1. Atualizar status da consulta para 'cancelled'
					const cancelNote = `[Sistema] Consulta cancelada automaticamente por mais de 1 hora de atraso. Horário agendado: ${new Date(appointment.appointmentDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Cancelada em: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`

					await db.appointment.update({
						where: { id: appointment.id },
						data: {
							status: 'cancelled',
							notes: appointment.notes
								? `${appointment.notes}\n\n${cancelNote}`
								: cancelNote,
						},
					})

					cancelled++

					// 2. Deletar sala do Daily.co se existir
					if (appointment.roomName) {
						try {
							await this.dailyService.deleteRoom(appointment.roomName)
						} catch (error) {
							logger.error({ err: error, appointmentId: appointment.id }, 'Erro ao deletar sala Daily da consulta expirada')
							// Continua mesmo se houver erro ao deletar a sala
						}
					}
				} catch (error) {
					logger.error({ err: error, appointmentId: appointment.id }, 'Erro ao processar consulta expirada')
					// Continua para processar as próximas consultas
				}
			}

			logger.info({ found: expiredAppointments.length, cancelled }, 'Consultas expiradas processadas')
		} catch (error) {
			logger.error({ err: error }, 'Erro no cron job de cancelamento de consultas expiradas')
		}
	}

	/** Remove sessões expiradas ou revogadas há mais de 7 dias. Executa diariamente às 03:30. */
	startSessionCleanup() {
		const run = async () => {
			try {
				const removed = await sessionService.deleteExpired()
				if (removed > 0) logger.info({ removed }, 'Sessões antigas removidas')
			} catch (error) {
				logger.error({ err: error }, 'Erro ao limpar sessões antigas')
			}
		}

		void run()
		cron.schedule('30 3 * * *', run)
	}

	/**
	 * Método para executar manualmente o cancelamento de consultas expiradas
	 * Útil para testes ou execução manual
	 */
	async runManually() {
		logger.info('Executando cancelamento de consultas expiradas manualmente')
		await this.cancelExpiredAppointments()
	}
}

export const cronService = new CronService()
