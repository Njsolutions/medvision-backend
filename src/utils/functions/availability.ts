interface Period {
	start: string
	end: string
}

interface DaySchedule {
	enabled: boolean
	periods?: Period[]
}

interface WeeklyAvailability {
	[key: string]: DaySchedule
}

/**
 * Valida se o médico está disponível no dia e horário especificado
 * @param weeklyAvailability - JSON com a disponibilidade semanal do médico
 * @param appointmentDate - Data e hora da consulta
 * @param durationMinutes - Duração da consulta em minutos (padrão: 60)
 * @returns objeto com isAvailable e mensagem de erro se não disponível
 */
export function validateDoctorAvailability(
	weeklyAvailability: any,
	appointmentDate: Date,
	durationMinutes: number = 60
): { isAvailable: boolean; message?: string } {
	if (!weeklyAvailability) {
		return {
			isAvailable: false,
			message: 'O médico não possui horários de disponibilidade configurados',
		}
	}

	// Converter de JsonValue para objeto se necessário
	let availability = weeklyAvailability
	if (typeof weeklyAvailability === 'string') {
		try {
			availability = JSON.parse(weeklyAvailability)
		} catch (e) {
			console.error('Erro ao parsear weeklyAvailability:', e)
			return {
				isAvailable: false,
				message: 'Erro ao processar disponibilidade do médico',
			}
		}
	}

	// Obter o dia da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
	const dayOfWeek = appointmentDate.getDay()
	const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
	const dayNamesPt = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
	const dayKey = dayNames[dayOfWeek]
	const dayNamePt = dayNamesPt[dayOfWeek]

	// Verificar se é array (novo formato) ou objeto (formato antigo)
	let daySchedule: any
	
	if (Array.isArray(availability)) {
		// Novo formato: array de objetos com { day, available, periods }
		daySchedule = availability.find((d: any) => d.day === dayKey)
	} else {
		// Formato antigo: objeto com chaves sendo os dias
		daySchedule = availability[dayKey]
	}
	
	if (!daySchedule) {
		return {
			isAvailable: false,
			message: `O médico não atende às ${dayNamePt}s`,
		}
	}
	
	// Verificar disponibilidade (pode ser 'available' ou 'enabled')
	const isEnabled = daySchedule.available === true || daySchedule.enabled === true
	
	if (!isEnabled) {
		return {
			isAvailable: false,
			message: `O médico não atende às ${dayNamePt}s`,
		}
	}

	// Obter hora e minuto da consulta
	const appointmentHour = appointmentDate.getHours()
	const appointmentMinute = appointmentDate.getMinutes()
	const appointmentTimeInMinutes = appointmentHour * 60 + appointmentMinute
	const appointmentEndTimeInMinutes = appointmentTimeInMinutes + durationMinutes

	// Verificar cada período de disponibilidade do dia
	if (!daySchedule.periods || daySchedule.periods.length === 0) {
		return {
			isAvailable: false,
			message: `O médico não possui horários configurados para ${dayNamePt}`,
		}
	}

	for (const period of daySchedule.periods) {
		// Suportar tanto 'start'/'end' quanto 'startTime'/'endTime'
		const startStr = period.start || period.startTime
		const endStr = period.end || period.endTime
		
		// Validar se os horários não estão vazios ou inválidos
		if (!startStr || !endStr || startStr.trim() === '' || endStr.trim() === '') {
			continue
		}
		
		const [startHour, startMinute] = startStr.split(':').map(Number)
		const [endHour, endMinute] = endStr.split(':').map(Number)
		
		const startTimeInMinutes = startHour * 60 + startMinute
		const endTimeInMinutes = endHour * 60 + endMinute

		// Verificar se a consulta INTEIRA está dentro deste período
		// A consulta deve começar dentro do período E terminar dentro do período
		if (appointmentTimeInMinutes >= startTimeInMinutes && appointmentEndTimeInMinutes <= endTimeInMinutes) {
			return { isAvailable: true }
		}
	}

	// Se chegou aqui, não está em nenhum período disponível
	const periodsText = daySchedule.periods
		.filter((p: any) => {
			const start = p.start || p.startTime
			const end = p.end || p.endTime
			return start && end && start.trim() !== '' && end.trim() !== ''
		})
		.map((p: any) => {
			const start = p.start || p.startTime
			const end = p.end || p.endTime
			return `${start} às ${end}`
		})
		.join(', ')

	return {
		isAvailable: false,
		message: `O médico não está disponível neste horário. Horários disponíveis às ${dayNamePt}s: ${periodsText}`,
	}
}

/**
 * Formata a disponibilidade semanal do médico para exibição
 */
export function formatWeeklyAvailability(weeklyAvailability: any): string {
	if (!weeklyAvailability) {
		return 'Nenhuma disponibilidade configurada'
	}

	// Converter de JsonValue para objeto se necessário
	let availability = weeklyAvailability
	if (typeof weeklyAvailability === 'string') {
		try {
			availability = JSON.parse(weeklyAvailability)
		} catch (e) {
			console.error('Erro ao parsear weeklyAvailability:', e)
			return 'Erro ao processar disponibilidade'
		}
	}

	const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
	const dayNamesPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
	
	const availableDays: string[] = []

	// Suportar formato de array ou objeto
	const schedules = Array.isArray(availability) 
		? availability 
		: dayNames.map(day => ({ day, ...availability[day] }))

	for (const schedule of schedules) {
		const dayIndex = dayNames.indexOf(schedule.day)
		if (dayIndex === -1) continue
		
		const dayNamePt = dayNamesPt[dayIndex]
		
		// Verificar disponibilidade (pode ser 'available' ou 'enabled')
		const isEnabled = schedule.available === true || schedule.enabled === true
		
		if (isEnabled && schedule.periods && schedule.periods.length > 0) {
			const periods = schedule.periods
				.filter((p: any) => {
					const start = p.start || p.startTime
					const end = p.end || p.endTime
					return start && end && start.trim() !== '' && end.trim() !== ''
				})
				.map((p: any) => {
					const start = p.start || p.startTime
					const end = p.end || p.endTime
					return `${start}-${end}`
				})
				.join(', ')
			
			if (periods) {
				availableDays.push(`${dayNamePt}: ${periods}`)
			}
		}
	}

	console.log('Dias disponíveis encontrados:', availableDays)

	return availableDays.length > 0 
		? availableDays.join(' | ') 
		: 'Nenhum dia disponível'
}
