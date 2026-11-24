import pino from 'pino'

// Nunca registrar credenciais nem dados pessoais. Os caminhos valem para qualquer objeto logado.
const REDACT_PATHS = [
	'req.headers.authorization',
	'req.headers.cookie',
	'res.headers["set-cookie"]',
	'*.password',
	'*.token',
	'*.accessToken',
	'*.refreshToken',
	'*.resetToken',
	'*.cpf',
	'*.email',
	'*.phone',
]

function stripQuery(url: string | undefined) {
	return (url ?? '').split('?')[0]
}

type RequestLike = { method?: string; url?: string; ip?: string }
type ReplyLike = { statusCode?: number }

// Opções compartilhadas pelo Fastify (`req.log`) e pelo logger dos serviços, para o formato ser o mesmo.
export const loggerOptions: pino.LoggerOptions = {
	level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
	redact: { paths: REDACT_PATHS, censor: '[redacted]' },
	serializers: {
		// Sem query string (pode ter CPF, tokens ou nomes) e sem cabeçalhos.
		req: (request: RequestLike) => ({ method: request.method, url: stripQuery(request.url), ip: request.ip }),
		res: (reply: ReplyLike) => ({ statusCode: reply.statusCode }),
		err: pino.stdSerializers.err,
	},
}

/**
 * Logger para código fora de uma requisição (serviços, cron, inicialização).
 * Em controllers, prefira `req.log`, que já traz o id da requisição.
 * Regra: logar IDs e códigos de erro, nunca nome, CPF, e-mail, conteúdo clínico, nome de arquivo ou token.
 */
export const logger = pino(loggerOptions)
