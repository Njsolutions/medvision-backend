import { BRAND, getLogoUrl } from './brand'

// Layout padrão de todos os e-mails: logo, título, saudação, blocos e rodapé.
// Somente estilos inline e tabelas, para compatibilidade com Gmail/Outlook.
// Todo texto recebido é tratado como texto puro e escapado.

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')

const block = (inner: string, paddingTop = 16): string => `
                    <tr>
                        <td style="padding:${paddingTop}px 40px 0 40px;">${inner}</td>
                    </tr>`

// ---------- Blocos de conteúdo ----------

export const paragraph = (text: string): string =>
	block(
		`<p style="margin:0;font-size:15px;line-height:1.6;color:${BRAND.text};">${escapeHtml(text)}</p>`,
	)

export const heading = (text: string): string =>
	block(
		`<h2 style="margin:0;font-size:16px;line-height:1.4;font-weight:700;color:${BRAND.primaryDark};">${escapeHtml(text)}</h2>`,
		24,
	)

export const codeBox = (code: string): string =>
	block(
		`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.primarySoft};border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.gold};border-radius:8px;">
                                <tr>
                                    <td align="center" style="padding:22px 20px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND.primaryDark};">${escapeHtml(code)}</td>
                                </tr>
                            </table>`,
		20,
	)

type DetailRow = [label: string, value?: string | null]

export const detailsBox = (rows: DetailRow[]): string => {
	const lines = rows
		.filter((row): row is [string, string] => Boolean(row[1]))
		.map(
			([label, value]) =>
				`<div style="padding:3px 0;font-size:15px;line-height:1.5;color:${BRAND.text};"><strong style="color:${BRAND.primaryDark};">${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`,
		)
		.join('')

	return block(
		`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.primarySoft};border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.primary};border-radius:8px;">
                                <tr>
                                    <td style="padding:16px 20px;">${lines}</td>
                                </tr>
                            </table>`,
		20,
	)
}

export const notice = (text: string): string =>
	block(
		`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FBF6EC;border:1px solid #EADDC2;border-left:4px solid ${BRAND.gold};border-radius:8px;">
                                <tr>
                                    <td style="padding:14px 20px;font-size:14px;line-height:1.6;color:#6B5421;">${escapeHtml(text)}</td>
                                </tr>
                            </table>`,
		20,
	)

export const bulletList = (items: string[]): string =>
	block(
		`<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7;color:${BRAND.text};">${items
			.map((item) => `<li>${escapeHtml(item)}</li>`)
			.join('')}</ul>`,
	)

export const button = (url: string, label: string): string =>
	block(
		`<table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" bgcolor="${BRAND.primary}" style="border-radius:8px;">
                                        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
                                    </td>
                                </tr>
                            </table>`,
		24,
	)

// Link em texto, para quando o botão não funciona no cliente de e-mail.
export const linkFallback = (url: string): string =>
	block(
		`<p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${escapeHtml(url)}" style="color:${BRAND.primary};word-break:break-all;">${escapeHtml(url)}</a></p>`,
	)

// ---------- Layout ----------

interface EmailLayoutParams {
	title: string
	name: string
	greetingPrefix?: string
	blocks: string[]
}

export const emailLayout = ({
	title,
	name,
	greetingPrefix = 'Olá,',
	blocks,
}: EmailLayoutParams): string => {
	const year = new Date().getFullYear()
	const safeTitle = escapeHtml(title)

	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.background};font-family:${BRAND.font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.background};padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background-color:#ffffff;border-radius:12px;border:1px solid ${BRAND.border};">
                    <tr>
                        <td style="padding:40px 40px 0 40px;">
                            <img src="${getLogoUrl()}" alt="${BRAND.name}" width="64" height="64" style="display:block;border:0;outline:none;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 40px 0 40px;">
                            <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${safeTitle}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 40px 0 40px;font-size:15px;line-height:1.6;color:${BRAND.text};">
                            ${escapeHtml(greetingPrefix)} <strong style="color:${BRAND.primary};">${escapeHtml(name)}</strong>.
                        </td>
                    </tr>${blocks.join('')}
                    <tr>
                        <td style="padding:32px 40px 0 40px;">
                            <div style="border-top:1px solid ${BRAND.border};font-size:0;line-height:0;">&nbsp;</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 40px 0 40px;font-size:13px;line-height:1.6;color:${BRAND.muted};">
                            – Equipe ${BRAND.name}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:12px 40px 36px 40px;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                            &copy; ${year} ${BRAND.name}. Todos os direitos reservados.<br>
                            Este é um e-mail automático, por favor não responda.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}
