import type { FastifyInstance } from 'fastify';
import { AnamneseController } from '@/controllers/anamnese.controller';

export function anamneseRoutes(app: FastifyInstance) {
	const controller = new AnamneseController(app);

	app.get('/', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.getAll(req, res)
	);
	
	app.get('/:id', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.getById(req, res)
	);
	
	app.get('/patient/:patientId', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.getByPatientId(req, res)
	);
	
	app.get('/doctor/:doctorId', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.getByDoctorId(req, res)
	);
	
	app.post('/', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.create(req, res)
	);
	
	app.put('/:id', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.update(req, res)
	);
	
	app.delete('/:id', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.delete(req, res)
	);

	// Gerar PDF da anamnese
	app.get('/:id/pdf', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.generatePDF(req, res)
	);

	// Assinar anamnese existente (retroativo)
	app.put('/:id/sign', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.signExisting(req, res)
	);

	// Verificar integridade e assinatura
	app.get('/:id/verify', { preHandler: [app.authenticate] }, async (req, res) =>
		controller.verifyIntegrity(req, res)
	);
}
