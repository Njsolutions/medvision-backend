import cron from 'node-cron'
import { db } from '@/lib/prisma'
import { createDailyService } from './daily.service'

export class CronService {
	private dailyService = createDailyService()

	/**
	 * Inicia o cron job para cancelar consultas expiradas
	 * Executa a cada 1 hora
	 */
	startExpiredAppointmentsCheck() {
		// Executa imediatamente ao iniciar para processar consultas já expiradas
		console.log('🚀 Executando verificação inicial de consultas expiradas...')
		this.cancelExpiredAppointments()

		// Executa a cada 1 hora (minuto 0 de cada hora)
		cron.schedule('0 * * * *', async () => {
			await this.cancelExpiredAppointments()
		})

		console.log('✅ Cron job de cancelamento de consultas expiradas iniciado (executa a cada 1 hora)')
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
			
			console.log(`🔍 [${now.toISOString()}] Verificando consultas expiradas...`)
			console.log(`📅 Data/hora atual: ${now.toISOString()} (Local: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`)
			console.log(`⏰ Tempo de corte (1 hora atrás): ${cutoffTime.toISOString()} (Local: ${cutoffTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`)
			console.log(`📌 Regra: Apenas consultas com status 'scheduled' agendadas antes de ${cutoffTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} serão canceladas`)
			console.log(`⚠️  Consultas com outros status (inProgress, completed, cancelled, noShow) serão IGNORADAS`)

			// Buscar todas as consultas agendadas primeiro para debug
			const allScheduled = await db.appointment.findMany({
				where: {
					status: 'scheduled',
				},
				select: {
					id: true,
					appointmentDate: true,
					status: true,
				},
			})

			console.log(`\n📊 Total de consultas agendadas no sistema: ${allScheduled.length}`)
			if (allScheduled.length > 0) {
				console.log('📋 Consultas agendadas encontradas:')
				for (const apt of allScheduled) {
					const aptDate = new Date(apt.appointmentDate)
					const isExpired = aptDate < cutoffTime
					const hoursDiff = (now.getTime() - aptDate.getTime()) / (1000 * 60 * 60)
					console.log(`   - ID: ${apt.id.substring(0, 8)}... | Data: ${aptDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} | Atraso: ${hoursDiff.toFixed(2)}h | Cancelar: ${isExpired ? '✅ SIM' : '❌ NÃO'}`)
				}
			}

			// Buscar consultas agendadas há mais de 1 hora (expiradas)
			const expiredAppointments = await db.appointment.findMany({
				where: {
					status: 'scheduled',
					appointmentDate: {
						lt: cutoffTime, // Consultas agendadas há mais de 1 hora
					},
				},
				include: {
					patient: {
						include: {
							user: {
								select: {
									name: true,
									email: true,
								},
							},
						},
					},
					doctor: {
						include: {
							user: {
								select: {
									name: true,
									email: true,
								},
							},
						},
					},
				},
			})

			if (expiredAppointments.length === 0) {
				console.log('✅ Nenhuma consulta expirada encontrada para cancelar.')
				return
			}

			console.log(`📋 Encontradas ${expiredAppointments.length} consultas expiradas para cancelar.`)
			console.log('🔄 Iniciando cancelamento...')

			// Processar cada consulta expirada
			for (const appointment of expiredAppointments) {
				try {
					// Verificação adicional de segurança: ignorar se não for 'scheduled'
					if (appointment.status !== 'scheduled') {
						console.log(`\n⚠️  Consulta ${appointment.id} IGNORADA - Status atual: '${appointment.status}' (não é 'scheduled')`)
						continue
					}

					console.log(`\n🔄 Processando consulta: ${appointment.id}`)
					console.log(`   Status atual: ${appointment.status}`)
					console.log(`   Paciente: ${appointment.patient.user.name}`)
					console.log(`   Médico: ${appointment.doctor.user.name}`)
					console.log(`   Data agendada: ${new Date(appointment.appointmentDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)
					
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

					console.log(`   ✅ Status atualizado para 'cancelled'`)

					// 2. Deletar sala do Daily.co se existir
					if (appointment.roomName) {
						try {
							console.log(`   🗑️  Deletando sala: ${appointment.roomName}`)
							await this.dailyService.deleteRoom(appointment.roomName)
							console.log(`   ✅ Sala deletada com sucesso`)
						} catch (error) {
							console.error(`   ❌ Erro ao deletar sala ${appointment.roomName}:`, error)
							// Continua mesmo se houver erro ao deletar a sala
						}
					} else {
						console.log(`   ℹ️  Nenhuma sala Daily.co associada`)
					}
					
					console.log(`✅ Consulta ${appointment.id.substring(0, 8)}... processada com sucesso\n`)
				} catch (error) {
					console.error(`❌ Erro ao processar consulta ${appointment.id}:`, error)
					// Continua para processar as próximas consultas
				}
			}

			console.log(`\n✅ ========================================`)
			console.log(`✅ Processamento concluído!`)
			console.log(`✅ Total de consultas canceladas: ${expiredAppointments.length}`)
			console.log(`✅ ========================================\n`)
		} catch (error) {
			console.error('❌ Erro no cron job de cancelamento de consultas expiradas:', error)
		}
	}

	/**
	 * Método para executar manualmente o cancelamento de consultas expiradas
	 * Útil para testes ou execução manual
	 */
	async runManually() {
		console.log('🔄 Executando cancelamento de consultas expiradas manualmente...')
		await this.cancelExpiredAppointments()
	}
}

export const cronService = new CronService()
