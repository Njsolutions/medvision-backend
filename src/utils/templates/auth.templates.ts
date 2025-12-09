import type {
	EmailTemplate,
	PasswordResetEmailData,
	VerificationEmailData,
	SecurityCodeEmailData,
	PasswordRecoveryCodeEmailData,
} from '../../types/email.types'
import { baseTemplate } from './base.template'

export const passwordResetTemplate = (
	data: PasswordResetEmailData,
): EmailTemplate => {
	const content = `
        <h2>Redefinição de Senha</h2>
        <p>Olá ${data.name},</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        
        <div class="info-box">
            <p><strong>Link válido por:</strong> ${data.expiresIn}</p>
        </div>
        
        <div style="text-align: center;">
            <a href="${data.resetUrl}" class="button">Redefinir Senha</a>
        </div>
        
        <div class="warning">
            <p><strong>Não solicitou esta redefinição?</strong> Ignore este email. Sua senha permanecerá a mesma.</p>
        </div>
        
        <div class="divider"></div>
        
        <p>Por segurança, este link expira em ${data.expiresIn}.</p>
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="word-break: break-all; color: #667eea;">${data.resetUrl}</p>
    `

	return {
		subject: 'Redefinição de Senha - MedVision',
		html: baseTemplate(content, 'Redefinição de Senha'),
	}
}

export const accountVerificationTemplate = (
	data: VerificationEmailData,
): EmailTemplate => {
	const content = `
        <h2>Verificação de Conta</h2>
        <p>Olá ${data.name},</p>
        <p>Obrigado por se cadastrar no MedVision! Para ativar sua conta, clique no botão abaixo:</p>
        
        <div style="text-align: center;">
            <a href="${data.verificationUrl}" class="button">Verificar Conta</a>
        </div>
        
        <div class="info-box">
            <p><strong>Link válido por:</strong> ${data.expiresIn}</p>
        </div>
        
        <div class="divider"></div>
        
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="word-break: break-all; color: #667eea;">${data.verificationUrl}</p>
        
        <p>Se você não criou uma conta no MedVision, ignore este email.</p>
    `

	return {
		subject: 'Verifique sua Conta - MedVision',
		html: baseTemplate(content, 'Verificação de Conta'),
	}
}

export const securityCodeTemplate = (
	data: SecurityCodeEmailData,
): EmailTemplate => {
	const content = `
        <h2>Código de Segurança</h2>
        <p>Olá ${data.name},</p>
        <p>Use o código abaixo para completar sua autenticação:</p>
        
        <div class="code-box">
            <div class="code">${data.securityCode}</div>
        </div>
        
        ${
					data.expiresIn
						? `
        <div class="info-box">
            <p><strong>Este código expira em:</strong> ${data.expiresIn}</p>
        </div>
        `
						: ''
				}
        
        <div class="warning">
            <p><strong>Não compartilhe este código com ninguém.</strong> Nossa equipe nunca solicitará este código.</p>
        </div>
        
        <div class="divider"></div>
        
        <p>Se você não solicitou este código, ignore este email ou entre em contato conosco imediatamente.</p>
    `

	return {
		subject: 'Seu Código de Segurança - MedVision',
		html: baseTemplate(content, 'Código de Segurança'),
	}
}

export const passwordRecoveryCodeTemplate = (
	data: PasswordRecoveryCodeEmailData,
): EmailTemplate => {
	const content = `
        <h2>Código de Recuperação de Senha</h2>
        <p>Olá ${data.name},</p>
        <p>Recebemos uma solicitação para recuperar sua senha. Use o código abaixo:</p>
        
        <div class="code-box">
            <div class="code">${data.recoveryCode}</div>
        </div>
        
        ${
					data.expiresIn
						? `
        <div class="info-box">
            <p><strong>Este código expira em:</strong> ${data.expiresIn}</p>
        </div>
        `
						: ''
				}
        
        <div class="warning">
            <p><strong>Não solicitou recuperação de senha?</strong> Ignore este email e sua senha permanecerá a mesma.</p>
        </div>
        
        <div class="divider"></div>
        
        <p>Por segurança, não compartilhe este código com ninguém.</p>
        <p>Nossa equipe nunca solicitará este código por telefone ou email.</p>
    `

	return {
		subject: 'Código de Recuperação de Senha - MedVision',
		html: baseTemplate(content, 'Recuperação de Senha'),
	}
}
