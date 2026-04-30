import 'dotenv/config'
import fastifyJwt from '@fastify/jwt'
import { fastify } from 'fastify'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
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

const version = process.env.API_VERSION || '1'
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
	throw new Error('JWT_SECRET must be configured')
}

const corsOrigins = (process.env.CORS_ORIGINS || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean)

const server = fastify({
	trustProxy: true,
}).withTypeProvider<ZodTypeProvider>()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

server.register(fastifyCors, {
	origin: corsOrigins,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

server.register(fastifyMultipart, {
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB
	},
})

server.register(fastifyWebsocket)

server.register(fastifyJwt, {
	secret: jwtSecret,
	cookie: {
		cookieName: 'token',
		signed: false,
	},
	sign: {
		expiresIn: '24h',
	},
})

// Registra o plugin de autenticação
server.register(authPlugin)

server.register(fastifySwagger, {
	openapi: {
		info: {
			title: `MedVision API v${version}`,
			version: version,
			description: 'API documentation',
		},
	},
	transform: jsonSchemaTransform,
})

server.register(ScalarApiReference, { routePrefix: `/v${version}/docs` })

server.addHook('onRequest', auditContextDecorator)

server.get('/health', async () => {
	return { status: 'ok' }
})

registerModules(server, version)

async function start() {
	try {
		await server.ready()
		await server.listen({ port: Number(process.env.PORT) || 3333, host: '0.0.0.0' })
		console.log(`Server listening at http://localhost:${Number(process.env.PORT) || 3333}`)
		console.log(`Docs listening at http://localhost:${Number(process.env.PORT) || 3333}/v${version}/docs`)
		
		rateLimitService.startCleanupInterval()
		cronService.startExpiredAppointmentsCheck()
	} catch (err) {
		console.error('Error starting server:', err)
		server.log.error(err)
		process.exit(1)
	}
}

start()
