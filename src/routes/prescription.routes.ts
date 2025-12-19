import type { FastifyInstance } from 'fastify'
import { prescriptionController } from '../controllers/prescription.controller'

export async function prescriptionRoutes(app: FastifyInstance) {
	// POST /prescriptions - Cria uma nova prescrição
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.create(req, res)
	)

	// GET /prescriptions - Lista prescrições
	app.get('/', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.list(req, res)
	)

	// GET /prescriptions/:id - Busca prescrição por ID
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.getById(req, res)
	)

	// PATCH /prescriptions/:id - Atualiza prescrição
	app.patch('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.update(req, res)
	)

	// DELETE /prescriptions/:id - Remove prescrição
	app.delete('/:id', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.delete(req, res)
	)

	// GET /prescriptions/:id/pdf - Gera PDF da prescrição
	app.get('/:id/pdf', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.generatePDF(req, res)
	)

	// PUT /prescriptions/:id/sign - Assina prescrição existente
	app.put('/:id/sign', { preHandler: [app.authenticate] }, async (req, res) => 
		prescriptionController.signPrescription(req, res)
	)
}
