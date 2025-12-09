import type {
	EmailTemplate,
	AppointmentEmailData,
} from '../../types/email.types'
import { baseTemplate } from './base.template'

export const appointmentConfirmationTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => {
	const content = `
        <h2>Consulta Confirmada!</h2>
        <p>Olá ${data.patientName},</p>
        <p>Sua consulta foi confirmada com sucesso. Confira os detalhes abaixo:</p>
        
        <div class="info-box">
            <p><strong>Médico(a):</strong> ${data.doctorName}</p>
            <p><strong>Data:</strong> ${data.appointmentDate}</p>
            <p><strong>Horário:</strong> ${data.appointmentTime}</p>
            ${data.specialty ? `<p><strong>Especialidade:</strong> ${data.specialty}</p>` : ''}
            ${data.location ? `<p><strong>Local:</strong> ${data.location}</p>` : ''}
            ${data.meetingUrl ? `<p><strong>Link da consulta:</strong> <a href="${data.meetingUrl}">Acessar consulta online</a></p>` : ''}
        </div>
        
        ${data.notes ? `<p><strong>Observações:</strong> ${data.notes}</p>` : ''}
        
        <div class="divider"></div>
        
        <p>Chegue com 15 minutos de antecedência. Em caso de impossibilidade de comparecer, favor avisar com antecedência.</p>
        <p>Estamos ansiosos para atendê-lo!</p>
    `

	return {
		subject: `Consulta Confirmada - ${data.appointmentDate}`,
		html: baseTemplate(content, 'Consulta Confirmada'),
	}
}

export const appointmentReminderTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => {
	const content = `
        <h2>Lembrete de Consulta</h2>
        <p>Olá ${data.patientName},</p>
        <p>Este é um lembrete da sua consulta agendada:</p>
        
        <div class="info-box">
            <p><strong>Médico(a):</strong> ${data.doctorName}</p>
            <p><strong>Data:</strong> ${data.appointmentDate}</p>
            <p><strong>Horário:</strong> ${data.appointmentTime}</p>
            ${data.specialty ? `<p><strong>Especialidade:</strong> ${data.specialty}</p>` : ''}
            ${data.location ? `<p><strong>Local:</strong> ${data.location}</p>` : ''}
        </div>
        
        ${
					data.meetingUrl
						? `
        <div style="text-align: center;">
            <a href="${data.meetingUrl}" class="button">Acessar Consulta Online</a>
        </div>
        `
						: ''
				}
        
        <p>Por favor, chegue com 15 minutos de antecedência.</p>
        <p>Nos vemos em breve!</p>
    `

	return {
		subject: `Lembrete: Consulta em ${data.appointmentDate}`,
		html: baseTemplate(content, 'Lembrete de Consulta'),
	}
}

export const appointmentCancelledTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => {
	const content = `
        <h2>Consulta Cancelada</h2>
        <p>Olá ${data.patientName},</p>
        <p>Informamos que a consulta abaixo foi cancelada:</p>
        
        <div class="info-box">
            <p><strong>Médico(a):</strong> ${data.doctorName}</p>
            <p><strong>Data:</strong> ${data.appointmentDate}</p>
            <p><strong>Horário:</strong> ${data.appointmentTime}</p>
            ${data.specialty ? `<p><strong>Especialidade:</strong> ${data.specialty}</p>` : ''}
        </div>
        
        ${data.notes ? `<p><strong>Motivo:</strong> ${data.notes}</p>` : ''}
        
        <div class="divider"></div>
        
        <p>Se desejar reagendar, entre em contato conosco.</p>
        <p>Pedimos desculpas por qualquer inconveniente.</p>
    `

	return {
		subject: `Consulta Cancelada - ${data.appointmentDate}`,
		html: baseTemplate(content, 'Consulta Cancelada'),
	}
}

export const appointmentRescheduledTemplate = (
	data: AppointmentEmailData,
): EmailTemplate => {
	const content = `
        <h2>Consulta Reagendada</h2>
        <p>Olá ${data.patientName},</p>
        <p>Sua consulta foi reagendada. Confira a nova data e horário:</p>
        
        <div class="info-box">
            <p><strong>Médico(a):</strong> ${data.doctorName}</p>
            <p><strong>Nova Data:</strong> ${data.appointmentDate}</p>
            <p><strong>Novo Horário:</strong> ${data.appointmentTime}</p>
            ${data.specialty ? `<p><strong>Especialidade:</strong> ${data.specialty}</p>` : ''}
            ${data.location ? `<p><strong>Local:</strong> ${data.location}</p>` : ''}
            ${data.meetingUrl ? `<p><strong>Link da consulta:</strong> <a href="${data.meetingUrl}">Acessar consulta online</a></p>` : ''}
        </div>
        
        ${data.notes ? `<p><strong>Observações:</strong> ${data.notes}</p>` : ''}
        
        <div class="divider"></div>
        
        <p>Por favor, chegue com 15 minutos de antecedência.</p>
        <p>Obrigado pela compreensão!</p>
    `

	return {
		subject: `Consulta Reagendada - Nova Data: ${data.appointmentDate}`,
		html: baseTemplate(content, 'Consulta Reagendada'),
	}
}
