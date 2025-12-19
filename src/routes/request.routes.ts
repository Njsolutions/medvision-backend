import type { FastifyInstance } from 'fastify'
import { RequestController } from '@/controllers/request.controller'

export function requestRoutes(app: FastifyInstance) {
	const controller = new RequestController(app)

	// Rotas específicas primeiro
	app.get('/patient/:patientId', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.findByPatientId(req, res)
	)
	
	app.get('/doctor/:doctorId', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.findByDoctorId(req, res)
	)
	
	// Rotas genéricas por último
	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.list(req, res)
	)
	
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.create(req, res)
	)
	
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.findById(req, res)
	)
	
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.update(req, res)
	)
	
	app.patch('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.update(req, res)
	)
	
	app.delete('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.delete(req, res)
	)

	// GET /requests/:id/pdf - Gera PDF da solicitação
	app.get('/:id/pdf', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.generatePDF(req, res)
	)
	
	// PUT /requests/:id/sign - Assina solicitação existente
	app.put('/:id/sign', { preHandler: [app.authenticate] }, async (req, res) => 
		controller.signRequest(req, res)
	)
}
