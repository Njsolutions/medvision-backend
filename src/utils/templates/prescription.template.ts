import type {
	EmailTemplate,
	PrescriptionEmailData,
} from '../../types/email.types'
import {
	emailLayout,
	paragraph,
	heading,
	detailsBox,
	bulletList,
} from './base.template'

export const prescriptionReadyTemplate = (
	data: PrescriptionEmailData,
): EmailTemplate => ({
	subject: 'Sua Receita Médica Está Pronta',
	html: emailLayout({
		title: 'Sua receita está pronta',
		name: data.patientName,
		blocks: [
			paragraph(`O(A) Dr(a). ${data.doctorName} preparou sua receita médica.`),
			detailsBox([['Data da prescrição', data.prescriptionDate]]),
			heading('Medicamentos prescritos'),
			data.medications.length > 0
				? bulletList(data.medications)
				: paragraph('Sem medicamentos prescritos.'),
			...(data.instructions
				? [heading('Instruções'), paragraph(data.instructions)]
				: []),
			paragraph(
				'Você pode retirar sua receita na recepção ou acessá-la pelo portal do paciente. Siga as orientações médicas com atenção.',
			),
		],
	}),
})
