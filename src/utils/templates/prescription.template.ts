import type {
	EmailTemplate,
	PrescriptionEmailData,
} from '../../types/email.types'
import { baseTemplate } from './base.template'

export const prescriptionReadyTemplate = (
	data: PrescriptionEmailData,
): EmailTemplate => {
	const medicationsList =
		data.medications.length > 0
			? `
        <ul class="list">
            ${data.medications.map((med) => `<li>${med}</li>`).join('')}
        </ul>
    `
			: '<p>Sem medicamentos prescritos.</p>'

	const content = `
        <h2>Sua Receita Está Pronta</h2>
        <p>Olá ${data.patientName},</p>
        <p>O Dr(a). ${data.doctorName} preparou sua receita médica.</p>
        
        <div class="info-box">
            <p><strong>Data da Prescrição:</strong> ${data.prescriptionDate}</p>
        </div>
        
        <h3 style="margin-top: 30px; margin-bottom: 15px; color: #667eea;">Medicamentos Prescritos:</h3>
        ${medicationsList}
        
        ${
					data.instructions
						? `
        <div class="divider"></div>
        <h3 style="margin-bottom: 15px; color: #667eea;">Instruções:</h3>
        <p>${data.instructions}</p>
        `
						: ''
				}
        
        <div class="divider"></div>
        
        <p>Você pode retirar sua receita na recepção ou acessá-la através do portal do paciente.</p>
        <p>Siga as orientações médicas cuidadosamente.</p>
    `

	return {
		subject: 'Sua Receita Médica Está Pronta',
		html: baseTemplate(content, 'Receita Médica Pronta'),
	}
}
