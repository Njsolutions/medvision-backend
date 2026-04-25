import type { FastifyInstance } from 'fastify'
import { PatientFileController } from '@/modules/patientfile/patientfile.controller'

export function patientFileRoutes(app: FastifyInstance) {
	const controller = new PatientFileController(app)

	// Upload de arquivo
	app.post(
		'/upload',
		{ preHandler: [app.authenticate] },
		async (req, res) => controller.uploadFile(req, res),
	)

	// Obter URL assinada para download
	app.get(
		'/:id/url',
		{ preHandler: [app.authenticate] },
		async (req, res) => controller.getFileUrl(req, res),
	)

	// Download direto do arquivo
	app.get(
		'/:id/download',
		{ preHandler: [app.authenticate] },
		async (req, res) => controller.downloadFile(req, res),
	)

	// Listar arquivos de um paciente
	app.get(
		'/patient/:patientId',
		{ preHandler: [app.authenticate] },
		async (req, res) => controller.listPatientFiles(req, res),
	)

	// Obter estatísticas de arquivos de um paciente
	app.get(
		'/patient/:id/stats',
		{ preHandler: [app.authenticate] },
		async (req, res) => controller.getPatientFileStats(req, res),
	)

	// Deletar arquivo (soft delete)
	app.delete(
		'/:id',
		{ preHandler: [app.authenticate] },
		async (req, res) => controller.deleteFile(req, res),
	)
}
