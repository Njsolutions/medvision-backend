import type { EmailTemplate, WelcomeEmailData } from '../../types/email.types'
import { baseTemplate } from './base.template'

export const welcomePatientTemplate = (
	data: WelcomeEmailData,
): EmailTemplate => {
	const content = `
        <h2>Bem-vindo ao MedVision!</h2>
        <p>Olá ${data.name},</p>
        <p>É um prazer tê-lo(a) conosco! Sua conta foi criada com sucesso.</p>
        
        <div class="info-box">
            <p><strong>Email cadastrado:</strong> ${data.email}</p>
        </div>
        
        <p>Agora você pode:</p>
        <ul class="list">
            <li>Agendar consultas com nossos médicos</li>
            <li>Acompanhar seu histórico médico</li>
            <li>Receber lembretes de consultas</li>
            <li>Acessar suas receitas e exames</li>
        </ul>
        
        ${
					data.loginUrl
						? `
        <div style="text-align: center;">
            <a href="${data.loginUrl}" class="button">Acessar Minha Conta</a>
        </div>
        `
						: ''
				}
        
        <div class="divider"></div>
        
        <p>Se tiver alguma dúvida, não hesite em nos contatar.</p>
        <p>Estamos aqui para cuidar de você!</p>
    `

	return {
		subject: 'Bem-vindo ao MedVision!',
		html: baseTemplate(content, 'Bem-vindo'),
	}
}

export const welcomeDoctorTemplate = (data: WelcomeEmailData): EmailTemplate => {
	const content = `
        <h2>Bem-vindo à Equipe MedVision!</h2>
        <p>Olá Dr(a). ${data.name},</p>
        <p>É uma honra tê-lo(a) em nossa equipe! Sua conta médica foi criada com sucesso.</p>
        
        <div class="info-box">
            <p><strong>Email de acesso:</strong> ${data.email}</p>
            ${data.temporaryPassword ? `<p><strong>Senha temporária:</strong> ${data.temporaryPassword}</p>` : ''}
        </div>
        
        ${
					data.temporaryPassword
						? `
        <div class="warning">
            <p><strong>Importante:</strong> Por segurança, altere sua senha no primeiro acesso.</p>
        </div>
        `
						: ''
				}
        
        <p>Como médico da plataforma, você tem acesso a:</p>
        <ul class="list">
            <li>Gerenciamento de consultas e agenda</li>
            <li>Histórico completo dos pacientes</li>
            <li>Emissão de receitas e prescrições</li>
            <li>Solicitação de exames</li>
            <li>Relatórios e estatísticas</li>
        </ul>
        
        ${
					data.loginUrl
						? `
        <div style="text-align: center;">
            <a href="${data.loginUrl}" class="button">Acessar Painel Médico</a>
        </div>
        `
						: ''
				}
        
        <div class="divider"></div>
        
        <p>Estamos felizes em tê-lo(a) conosco!</p>
    `

	return {
		subject: 'Bem-vindo à Equipe MedVision!',
		html: baseTemplate(content, 'Bem-vindo à Equipe'),
	}
}
