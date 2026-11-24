import 'dotenv/config'
import fastifyCookie from '@fastify/cookie'
import { fastify } from 'fastify'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyMultipart from '@fastify/multipart'
import fastifyWebsocket from '@fastify/websocket'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { auditContextDecorator } from './plugins/audit.plugin'
import authPlugin from './plugins/auth.plugin'
import { cronService } from './services/cron.service'
import { rateLimitService } from './services/ratelimit.service'
import { registerModules } from './modules'
import { loggerOptions } from '@/lib/logger'

const version = process.env.API_VERSION || '1'

// Segredo do servidor (HMAC do código de recuperação de senha).
if (!process.env.COOKIE_SECRET) {
	throw new Error('COOKIE_SECRET must be configured')
}

const corsOrigins = (process.env.CORS_ORIGINS || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean)

const server = fastify({
	// Logger do Fastify (`req.log`) com redação de credenciais e dados pessoais. Nível por LOG_LEVEL.
	logger: loggerOptions,
	trustProxy: true,
}).withTypeProvider<ZodTypeProvider>()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

// A API só devolve JSON/PDF, então a CSP fica a cargo do host do frontend (e evita quebrar a página de docs).
// CORP cross-origin: o frontend (outro host do mesmo site) carrega arquivos da API.
server.register(fastifyHelmet, {
	contentSecurityPolicy: false,
	crossOriginResourcePolicy: { policy: 'cross-origin' },
})

server.register(fastifyCors, {
	origin: corsOrigins,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

server.register(fastifyCookie)

server.register(fastifyMultipart, {
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB
	},
})

server.register(fastifyWebsocket)

// Registra o plugin de autenticação
server.register(authPlugin)

server.register(fastifySwagger, {
	openapi: {
		info: {
			title: `Amparo Online API v${version}`,
			version: version,
			description: 'API documentation',
		},
	},
	transform: jsonSchemaTransform,
})

// Documentação: livre fora de produção. Em produção fica desligada, a menos que ENABLE_DOCS=true,
// e mesmo ligada só o usuário master acessa (a página e o openapi.json).
const isProduction = process.env.NODE_ENV === 'production'
const docsEnabled = !isProduction || process.env.ENABLE_DOCS === 'true'

if (docsEnabled) {
	server.register(async (docs) => {
		if (isProduction) {
			docs.addHook('onRequest', docs.authenticate)
			docs.addHook('preHandler', async (req, res) => {
				if (req.user?.role !== 'master') {
					return res.status(403).send({ error: 'Apenas o usuário master pode acessar a documentação' })
				}
			})
		}

		await docs.register(ScalarApiReference, { routePrefix: `/v${version}/docs` })
	})
}

server.addHook('onRequest', auditContextDecorator)

server.get('/health', async () => {
	return { status: 'ok' }
})

registerModules(server, version)

async function start() {
	try {
		await server.ready()
		await server.listen({ port: Number(process.env.PORT) || 3333, host: '0.0.0.0' })
		if (docsEnabled) {
			server.log.info(`Docs em /v${version}/docs`)
		}
		
		rateLimitService.startCleanupInterval()
		cronService.startExpiredAppointmentsCheck()
		cronService.startSessionCleanup()
	} catch (err) {
		server.log.error({ err }, 'Error starting server')
		process.exit(1)
	}
}

start()
