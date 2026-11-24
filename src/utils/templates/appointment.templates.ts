import type {
	EmailTemplate,
	AppointmentEmailData,
} from '../../types/email.types'
import {
	emailLayout,
	paragraph,
	detailsBox,
	notice,
	button,
} from './base.template'

export const appointmentConfirmationTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => ({
	subject: `Consulta Confirmada - ${data.appointmentDate}`,
	html: emailLayout({
		title: 'Consulta confirmada',
		name: data.patientName,
		blocks: [
			paragraph(
				'Sua consulta foi confirmada com sucesso. Confira os detalhes abaixo:',
			),
			detailsBox([
				['Médico(a)', data.doctorName],
				['Data', data.appointmentDate],
				['Horário', data.appointmentTime],
				['Especialidade', data.specialty],
				['Local', data.location],
				['Observações', data.notes],
			]),
			...(data.meetingUrl
				? [button(data.meetingUrl, 'Acessar consulta online')]
				: []),
			paragraph(
				'Chegue com 15 minutos de antecedência. Em caso de impossibilidade de comparecer, avise com antecedência.',
			),
			paragraph('Estamos ansiosos para atendê-lo(a)!'),
		],
	}),
})

export const appointmentReminderTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => ({
	subject: `Lembrete: Consulta em ${data.appointmentDate}`,
	html: emailLayout({
		title: 'Lembrete de consulta',
		name: data.patientName,
		blocks: [
			paragraph('Este é um lembrete da sua consulta agendada:'),
			detailsBox([
				['Médico(a)', data.doctorName],
				['Data', data.appointmentDate],
				['Horário', data.appointmentTime],
				['Especialidade', data.specialty],
				['Local', data.location],
			]),
			...(data.meetingUrl
				? [button(data.meetingUrl, 'Acessar consulta online')]
				: []),
			paragraph('Por favor, chegue com 15 minutos de antecedência. Nos vemos em breve!'),
		],
	}),
})

export const appointmentCancelledTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => ({
	subject: `Consulta Cancelada - ${data.appointmentDate}`,
	html: emailLayout({
		title: 'Consulta cancelada',
		name: data.patientName,
		blocks: [
			paragraph('Informamos que a consulta abaixo foi cancelada:'),
			detailsBox([
				['Médico(a)', data.doctorName],
				['Data', data.appointmentDate],
				['Horário', data.appointmentTime],
				['Especialidade', data.specialty],
				['Motivo', data.notes],
			]),
			notice('Se desejar reagendar, entre em contato conosco.'),
			paragraph('Pedimos desculpas por qualquer inconveniente.'),
		],
	}),
})

export const appointmentRescheduledTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => ({
	subject: `Consulta Reagendada - Nova Data: ${data.appointmentDate}`,
	html: emailLayout({
		title: 'Consulta reagendada',
		name: data.patientName,
		blocks: [
			paragraph('Sua consulta foi reagendada. Confira a nova data e horário:'),
			detailsBox([
				['Médico(a)', data.doctorName],
				['Nova data', data.appointmentDate],
				['Novo horário', data.appointmentTime],
				['Especialidade', data.specialty],
				['Local', data.location],
				['Observações', data.notes],
			]),
			...(data.meetingUrl
				? [button(data.meetingUrl, 'Acessar consulta online')]
				: []),
			paragraph('Por favor, chegue com 15 minutos de antecedência. Obrigado pela compreensão!'),
		],
	}),
})
