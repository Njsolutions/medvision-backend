import fastifyJwt from '@fastify/jwt'
import { fastify } from 'fastify'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { authRoutes } from './routes/auth.routes'
import { adminRoutes } from './routes/admin.routes'
import { doctorRoutes } from './routes/doctor.routes'
import { patientRoutes } from './routes/patient.routes'
import { utiRoutes } from './routes/uti.routes'
import { appointmentRoutes } from './routes/appointment.routes'
import { auditLogRoutes } from './routes/auditlog.routes'
import { triagemRoutes } from './routes/triagem.routes'
import { patientFileRoutes } from './routes/patientfile.routes'
import { requestRoutes } from './routes/request.routes'
import { prescriptionRoutes } from './routes/prescription.routes'
import { anamneseRoutes } from './routes/anamnese.routes'
import { auditContextDecorator } from './plugins/audit.plugin'
import authPlugin from './plugins/auth.plugin'
import { cronService } from './services/cron.service'

const version = process.env.API_VERSION || '1'

const server = fastify({
	trustProxy: true,
}).withTypeProvider<ZodTypeProvider>()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

server.register(fastifyCors, {
	origin: ['http://localhost:5173', 'https://medvision-frontend.vercel.app', 'https://medvision.njsolutions.com.br'],
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

server.register(fastifyMultipart, {
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB
	},
})

server.register(fastifyJwt, {
	secret: process.env.JWT_SECRET || '',
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

server.register(authRoutes, { prefix: `/v${version}/auth` })
server.register(adminRoutes, { prefix: `/v${version}/admins` })
server.register(doctorRoutes, { prefix: `/v${version}/doctors` })
server.register(patientRoutes, { prefix: `/v${version}/patients` })
server.register(utiRoutes, { prefix: `/v${version}/utis` })
server.register(appointmentRoutes, { prefix: `/v${version}/appointments` })
server.register(auditLogRoutes, { prefix: `/v${version}/audit-logs` })
server.register(triagemRoutes, { prefix: `/v${version}/triagens` })
server.register(patientFileRoutes, { prefix: `/v${version}/patient-files` })
server.register(requestRoutes, { prefix: `/v${version}/requests` })
server.register(prescriptionRoutes, { prefix: `/v${version}/prescriptions` })
server.register(anamneseRoutes, { prefix: `/v${version}/anamneses` })

async function start() {
	try {
		await server.ready()
		await server.listen({ port: Number(process.env.PORT) || 3333, host: '0.0.0.0' })
		console.log(`Server listening at http://localhost:${Number(process.env.PORT) || 3333}`)
		console.log(`Docs listening at http://localhost:${Number(process.env.PORT) || 3333}/v${version}/docs`)
		
		// Inicializa o cron job de cancelamento de consultas expiradas
		cronService.startExpiredAppointmentsCheck()
	} catch (err) {
		console.error('Error starting server:', err)
		server.log.error(err)
		process.exit(1)
	}
}

start()
