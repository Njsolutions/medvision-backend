import type {
	EmailTemplate,
	PasswordResetEmailData,
	VerificationEmailData,
	SecurityCodeEmailData,
	PasswordRecoveryCodeEmailData,
} from '../../types/email.types'
import {
	emailLayout,
	paragraph,
	codeBox,
	detailsBox,
	notice,
	button,
	linkFallback,
} from './base.template'

export const passwordResetTemplate = (
	data: PasswordResetEmailData,
): EmailTemplate => {
	const title = 'Redefinição de senha'

	return {
		subject: 'Redefinição de Senha - Amparo Online',
		html: emailLayout({
			title,
			name: data.name,
			blocks: [
				paragraph('Recebemos uma solicitação para redefinir a senha da sua conta.'),
				button(data.resetUrl, 'Redefinir senha'),
				detailsBox([['Link válido por', data.expiresIn]]),
				linkFallback(data.resetUrl),
				notice(
					'Não solicitou esta redefinição? Ignore este e-mail: sua senha permanecerá a mesma.',
				),
			],
		}),
	}
}

export const accountVerificationTemplate = (
	data: VerificationEmailData,
): EmailTemplate => {
	const title = 'Verificação de conta'

	return {
		subject: 'Verifique sua Conta - Amparo Online',
		html: emailLayout({
			title,
			name: data.name,
			blocks: [
				paragraph(
					'Obrigado por se cadastrar no Amparo Online! Para ativar sua conta, clique no botão abaixo.',
				),
				button(data.verificationUrl, 'Verificar conta'),
				detailsBox([['Link válido por', data.expiresIn]]),
				linkFallback(data.verificationUrl),
				paragraph(
					'Se você não criou uma conta no Amparo Online, ignore este e-mail.',
				),
			],
		}),
	}
}

export const securityCodeTemplate = (
	data: SecurityCodeEmailData,
): EmailTemplate => {
	const title = 'Código de segurança'

	return {
		subject: 'Seu Código de Segurança - Amparo Online',
		html: emailLayout({
			title,
			name: data.name,
			blocks: [
				paragraph('Aqui está o seu código para completar a autenticação:'),
				codeBox(data.securityCode),
				...(data.expiresIn
					? [detailsBox([['Este código expira em', data.expiresIn]])]
					: []),
				notice(
					'Não compartilhe este código com ninguém. Nossa equipe nunca solicitará este código.',
				),
				paragraph(
					'Se você não solicitou este código, ignore este e-mail ou entre em contato conosco imediatamente.',
				),
			],
		}),
	}
}

export const passwordRecoveryCodeTemplate = (
	data: PasswordRecoveryCodeEmailData,
): EmailTemplate => {
	const title = 'Recuperação de senha'

	return {
		subject: 'Código de Recuperação de Senha - Amparo Online',
		html: emailLayout({
			title,
			name: data.name,
			blocks: [
				paragraph(
					'Aqui está o seu código de confirmação para a recuperação de senha:',
				),
				codeBox(data.recoveryCode),
				...(data.expiresIn
					? [detailsBox([['Este código expira em', data.expiresIn]])]
					: []),
				notice(
					'Não solicitou a recuperação? Ignore este e-mail: sua senha permanecerá a mesma. Nunca compartilhe este código com ninguém.',
				),
			],
		}),
	}
}
