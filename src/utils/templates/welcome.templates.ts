import type { EmailTemplate, WelcomeEmailData } from '../../types/email.types'
import {
	emailLayout,
	paragraph,
	detailsBox,
	notice,
	bulletList,
	button,
} from './base.template'

export const welcomePatientTemplate = (
	data: WelcomeEmailData,
): EmailTemplate => ({
	subject: 'Bem-vindo ao Amparo Online!',
	html: emailLayout({
		title: 'Bem-vindo ao Amparo Online!',
		name: data.name,
		blocks: [
			paragraph('É um prazer ter você conosco! Sua conta foi criada com sucesso.'),
			detailsBox([['E-mail cadastrado', data.email]]),
			paragraph('Agora você pode:'),
			bulletList([
				'Agendar consultas com nossos médicos',
				'Acompanhar seu histórico médico',
				'Receber lembretes de consultas',
				'Acessar suas receitas e exames',
			]),
			...(data.loginUrl ? [button(data.loginUrl, 'Acessar minha conta')] : []),
			paragraph(
				'Se tiver alguma dúvida, não hesite em nos contatar. Estamos aqui para cuidar de você!',
			),
		],
	}),
})

export const welcomeDoctorTemplate = (
	data: WelcomeEmailData,
): EmailTemplate => ({
	subject: 'Bem-vindo à Equipe Amparo Online!',
	html: emailLayout({
		title: 'Bem-vindo à equipe Amparo Online!',
		name: data.name,
		greetingPrefix: 'Olá, Dr(a).',
		blocks: [
			paragraph(
				'É uma honra ter você em nossa equipe! Sua conta médica foi criada com sucesso.',
			),
			detailsBox([['E-mail de acesso', data.email]]),
			...(data.setPasswordUrl
				? [
						paragraph('Para entrar pela primeira vez, defina a sua senha pelo botão abaixo.'),
						button(data.setPasswordUrl, 'Definir minha senha'),
						notice(`O link é de uso único e vale por ${data.expiresIn ?? '72 horas'}. Depois disso, peça um novo acesso ao administrador.`),
					]
				: []),
			paragraph('Como médico(a) da plataforma, você tem acesso a:'),
			bulletList([
				'Gerenciamento de consultas e agenda',
				'Histórico completo dos pacientes',
				'Emissão de receitas e prescrições',
				'Solicitação de exames',
				'Relatórios e estatísticas',
			]),
			...(data.loginUrl ? [button(data.loginUrl, 'Acessar painel médico')] : []),
			paragraph('Estamos felizes em ter você conosco!'),
		],
	}),
})

export const welcomeAdminTemplate = (
	data: WelcomeEmailData,
): EmailTemplate => ({
	subject: 'Seu acesso administrativo ao Amparo Online',
	html: emailLayout({
		title: 'Seu acesso ao Amparo Online',
		name: data.name,
		blocks: [
			paragraph('Sua conta administrativa foi criada com sucesso.'),
			detailsBox([['E-mail de acesso', data.email]]),
			...(data.setPasswordUrl
				? [
						paragraph('Para entrar pela primeira vez, defina a sua senha pelo botão abaixo.'),
						button(data.setPasswordUrl, 'Definir minha senha'),
						notice(`O link é de uso único e vale por ${data.expiresIn ?? '72 horas'}. Depois disso, peça um novo acesso ao administrador.`),
					]
				: []),
		],
	}),
})
