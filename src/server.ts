import fastifyJwt from '@fastify/jwt'
import { fastify } from 'fastify'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { serializerCompiler, validatorCompiler, jsonSchemaTransform } from 'fastify-type-provider-zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

const version = process.env.API_VERSION || '1'

const server = fastify({
	trustProxy: true
}).withTypeProvider<ZodTypeProvider>()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

server.register(fastifyCors, {
	origin: ['http://localhost:5173', 'https://medvision-frontend.vercel.app', 'https://medvision.njsolutions.com.br'],
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

async function start() {
	try {
		await server.ready()
		await server.listen({ port: Number(process.env.PORT) || 3333, host: '0.0.0.0' })
		console.log(`Server listening at http://localhost:${Number(process.env.PORT) || 3333}`)
		console.log(`Docs listening at http://localhost:${Number(process.env.PORT) || 3333}/v${version}/docs`)
	} catch (err) {
		console.error('Error starting server:', err)
		server.log.error(err)
		process.exit(1)
	}
}

start()
