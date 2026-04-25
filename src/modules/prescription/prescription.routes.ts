import type { FastifyInstance } from 'fastify'
import { prescriptionController } from './prescription.controller'

export async function prescriptionRoutes(app: FastifyInstance) {
	// POST /prescriptions - Cria uma nova prescrição
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.create(req as any, res)
	)

	// GET /prescriptions - Lista prescrições
	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.list(req as any, res)
	)

	// GET /prescriptions/:id - Busca prescrição por ID
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.getById(req as any, res)
	)

	// PATCH /prescriptions/:id - Atualiza prescrição
	app.patch('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.update(req as any, res)
	)

	// DELETE /prescriptions/:id - Remove prescrição
	app.delete('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.delete(req as any, res)
	)

	// GET /prescriptions/:id/pdf - Gera PDF da prescrição
	app.get('/:id/pdf', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.generatePDF(req as any, res)
	)

	// PUT /prescriptions/:id/sign - Assina prescrição existente
	app.put('/:id/sign', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.signPrescription(req as any, res)
	)
}
