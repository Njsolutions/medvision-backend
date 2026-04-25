import { anamneseRepository } from '@/modules/anamnese/anamnese.repository';
import {
	createAnamneseSchema,
	updateAnamneseSchema,
	getAnamneseByIdSchema,
	getAnamnesesByPatientSchema,
	getAnamnesesByDoctorSchema,
} from '@/modules/anamnese/anamnese.schema';
import { auditService } from '@/services/audit.service';
import { ImpactLevel } from '@/types/audit.types';
import { signatureService } from '@/services/signature.service';
import { signatureRepository } from '@/repositories/signature.repository';
import { pdfGeneratorService } from '@/services/pdf-generator.service';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export class AnamneseController {
	constructor(_fastify: FastifyInstance) {}

	async create(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = createAnamneseSchema.safeParse(req.body);

			if (!validation.success) {
				return res.status(400).send({
					error: 'Invalid data',
					details: validation.error.issues,
				});
			}

			// Cria a anamnese
			const anamnese = await anamneseRepository.create(validation.data);

		// Busca dados completos do usuário/médico para a assinatura
		const user = await anamneseRepository.getUserWithDoctor(req.user!.id);
		if (!user) {
			return res.status(401).send({ error: 'Usuário não encontrado' });
		}

		// ✅ GERA ASSINATURA ELETRÔNICA AUTOMÁTICA
		const documentContent = {
			id: anamnese.id,
			patientId: anamnese.patientId,
			doctorId: anamnese.doctorId,
			appointmentId: anamnese.appointmentId,
			queixaPrincipal: anamnese.queixaPrincipal,
			hdaInicio: anamnese.hdaInicio,
			hdaDuracao: anamnese.hdaDuracao,
			hipoteseDiagnostica: anamnese.hipoteseDiagnostica,
			cid10: anamnese.cid10,
			condutaClinica: anamnese.condutaClinica,
			createdAt: anamnese.createdAt,
		};

		const documentHash = signatureService.generateDocumentHash(documentContent);

		const signatureData = {
			documentHash,
			signerId: user.id,
			signerName: user.name,
			signerCRM: user.doctor?.crm,
			timestamp: new Date(),
			ipAddress: req.ip,
			userAgent: req.headers['user-agent'],
			documentType: 'anamnese',
			documentId: anamnese.id,
		};

		const signatureResult = signatureService.signDocument(signatureData);

		// Salva assinatura no banco
		const signature = await signatureRepository.create({
			certificateId: signatureResult.certificateId,
			documentType: 'anamnese',
			documentId: anamnese.id,
			documentHash: signatureResult.documentHash,
			signerId: user.id,
			signerName: user.name,
			signerCRM: user.doctor?.crm,
			signerRole: user.role,
			signature: signatureResult.signature,
			ipAddress: req.ip,
			userAgent: req.headers['user-agent'],
			signedAt: signatureResult.timestamp,
		});

		// Gera certificado
		const certificate = signatureService.generateCertificate(
			signatureData,
			signatureResult
		);

		// Audit log
		await auditService.log({
			userId: user.id,
			action: 'CREATE_ANAMNESE',
			description: `Anamnese criada e assinada eletronicamente para paciente ${validation.data.patientId}`,
			content: {
				anamneseId: anamnese.id,
				patientId: anamnese.patientId,
				doctorId: anamnese.doctorId,
				appointmentId: anamnese.appointmentId,
				certificateId: signature.certificateId,
			},
			impactLevel: ImpactLevel.MEDIUM,
			ipAddress: req.ip,
			userAgent: req.headers['user-agent'],
		});

		return res.status(201).send({
				message: 'Anamnese criada e assinada com sucesso',
				data: anamnese,
				signature: {
					certificateId: signature.certificateId,
					signedAt: signature.signedAt,
					signedBy: signature.signerName,
					documentHash: signature.documentHash,
					certificate, // Certificado formatado
				},
			});
		} catch (error) {
			console.error('Error creating anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getById(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamneseByIdSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'ID inválido',
					details: validation.error.issues,
				});
			}

			const anamnese = await anamneseRepository.findById(validation.data.id);

			if (!anamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			// ✅ BUSCA ASSINATURA DA ANAMNESE
			const signatures = await signatureRepository.findByDocument(
				'anamnese',
				anamnese.id
			);

			return res.status(200).send({
				message: 'Anamnese encontrada',
				data: anamnese,
				signatures, // Inclui assinaturas
			});
		} catch (error) {
			console.error('Error getting anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getByPatientId(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamnesesByPatientSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'Patient ID inválido',
					details: validation.error.issues,
				});
			}

			const anamneses = await anamneseRepository.findByPatientId(validation.data.patientId);

			return res.status(200).send({
				message: 'Anamneses encontradas',
				data: anamneses,
			});
		} catch (error) {
			console.error('Error getting anamneses by patient:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getByDoctorId(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamnesesByDoctorSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'Doctor ID inválido',
					details: validation.error.issues,
				});
			}

			const anamneses = await anamneseRepository.findByDoctorId(validation.data.doctorId);

			return res.status(200).send({
				message: 'Anamneses encontradas',
				data: anamneses,
			});
		} catch (error) {
			console.error('Error getting anamneses by doctor:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async getAll(_req: FastifyRequest, res: FastifyReply) {
		try {
			const anamneses = await anamneseRepository.findAll();

			return res.status(200).send({
				message: 'Anamneses encontradas',
				data: anamneses,
			});
		} catch (error) {
			console.error('Error getting all anamneses:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async update(req: FastifyRequest, res: FastifyReply) {
		try {
			const paramsValidation = getAnamneseByIdSchema.safeParse(req.params);

			if (!paramsValidation.success) {
				return res.status(400).send({
					error: 'ID inválido',
					details: paramsValidation.error.issues,
				});
			}

			const dataValidation = updateAnamneseSchema.safeParse(req.body);

			if (!dataValidation.success) {
				return res.status(400).send({
					error: 'Dados inválidos',
					details: dataValidation.error.issues,
				});
			}

			const existingAnamnese = await anamneseRepository.findById(paramsValidation.data.id);

			if (!existingAnamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			const anamnese = await anamneseRepository.update(
				paramsValidation.data.id,
				dataValidation.data
			);

			// Audit log
			await auditService.log({
				userId: req.user!.id,
				action: 'UPDATE_ANAMNESE',
				description: `Anamnese ${anamnese.id} atualizada`,
				content: {
					anamneseId: anamnese.id,
					patientId: anamnese.patientId,
					doctorId: anamnese.doctorId,
					changes: dataValidation.data,
				},
				impactLevel: ImpactLevel.MEDIUM,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			});

			return res.status(200).send({
				message: 'Anamnese atualizada com sucesso',
				data: anamnese,
			});
		} catch (error) {
			console.error('Error updating anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	async delete(req: FastifyRequest, res: FastifyReply) {
		try {
			const validation = getAnamneseByIdSchema.safeParse(req.params);

			if (!validation.success) {
				return res.status(400).send({
					error: 'ID inválido',
					details: validation.error.issues,
				});
			}

			const existingAnamnese = await anamneseRepository.findById(validation.data.id);

			if (!existingAnamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			await anamneseRepository.delete(validation.data.id);

			// Audit log
			await auditService.log({
				userId: req.user!.id,
				action: 'DELETE_ANAMNESE',
				description: `Anamnese ${validation.data.id} deletada`,
				content: {
					anamneseId: validation.data.id,
					patientId: existingAnamnese.patientId,
					doctorId: existingAnamnese.doctorId,
				},
				impactLevel: ImpactLevel.HIGH,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'],
			});

			return res.status(200).send({
				message: 'Anamnese deletada com sucesso',
			});
		} catch (error) {
			console.error('Error deleting anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	/**
	 * Gera PDF da anamnese em base64
	 */
	async generatePDF(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = req.params as { id: string };

			// Busca anamnese com todas as relações
			const anamnese = await anamneseRepository.findById(id);

			if (!anamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			// Verifica permissão (somente médico que criou, paciente ou admin)
			const userId = req.user!.id;
			
			// Busca o usuário com informações de doctor/patient
			const user = await anamneseRepository.getUserWithDoctor(userId);
			if (!user) {
				return res.status(401).send({ error: 'Usuário não encontrado' });
			}
			
			const isDoctor = anamnese.doctorId === user.doctor?.id;
			const isPatient = anamnese.patientId === userId; // patientId é o userId
			const isAdmin = user.role === 'admin' || user.role === 'master';

			if (!isDoctor && !isPatient && !isAdmin) {
				return res.status(403).send({ 
					error: 'Você não tem permissão para acessar esta anamnese' 
				});
			}

			// Busca assinatura
			const signatures = await signatureRepository.findByDocument('anamnese', id);
			const signature = signatures.length > 0 ? signatures[0] : undefined;

			console.log('🔍 Assinaturas encontradas:', signatures.length);
			if (signature) {
				console.log('✅ Assinatura será incluída no PDF:', {
					signedBy: signature.signerName,
					crm: signature.signerCRM,
					certificateId: signature.certificateId,
				});
			} else {
				console.warn('⚠️ Nenhuma assinatura encontrada para esta anamnese - PDF será gerado sem assinatura');
			}

			// Gera PDF
			const base64PDF = await pdfGeneratorService.generateAnamnesePDF(
				anamnese as any,
				signature ? {
					certificateId: signature.certificateId,
					signedBy: signature.signerName,
					signedAt: signature.signedAt,
					documentHash: signature.documentHash,
					crm: signature.signerCRM,
				} : undefined
			);

			// Registra acesso no audit log (opcional - não bloqueia se falhar)
			try {
				await auditService.log({
					userId: req.user?.sub || req.user?.id || 'unknown',
					action: 'GENERATE_ANAMNESE_PDF',
					description: `PDF gerado para anamnese ${id}`,
					content: { anamneseId: id },
					impactLevel: ImpactLevel.LOW,
					ipAddress: req.ip,
					userAgent: req.headers['user-agent'],
				});
			} catch (auditError) {
				console.warn('⚠️ Erro ao registrar audit log:', auditError);
			}

			return res.status(200).send({
				message: 'PDF gerado com sucesso',
				data: {
					pdf: base64PDF,
					filename: `medvision-anamnese-${anamnese.patient.user.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`,
					mimeType: 'application/pdf',
					size: Buffer.from(base64PDF, 'base64').length,
				},
			});
		} catch (error) {
			console.error('❌ Error generating PDF:', error);
			if (error instanceof Error) {
				console.error('Error message:', error.message);
				console.error('Error stack:', error.stack);
			}
			return res.status(500).send({ 
				error: 'Erro ao gerar PDF',
				details: error instanceof Error ? error.message : String(error)
			});
		}
	}

	/**
	 * Assina uma anamnese existente que não tem assinatura
	 */
	async signExisting(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = req.params as { id: string };

			const anamnese = await anamneseRepository.findById(id);
			if (!anamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			// Verifica se já tem assinatura
			const existingSignatures = await signatureRepository.findByDocument('anamnese', id);
			if (existingSignatures.length > 0) {
				return res.status(400).send({ 
					error: 'Esta anamnese já possui assinatura eletrônica' 
				});
			}

			// Gera hash do conteúdo
			const documentContent = {
				id: anamnese.id,
				patientId: anamnese.patientId,
				doctorId: anamnese.doctorId,
				appointmentId: anamnese.appointmentId,
				queixaPrincipal: anamnese.queixaPrincipal,
				historiaDoencaAtual: anamnese.hdaInicio,
				createdAt: anamnese.createdAt.toISOString(),
			};

			const documentHash = signatureService.generateDocumentHash(JSON.stringify(documentContent));
			const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

			// Cria assinatura
			const signatureData = {
				documentType: 'anamnese' as const,
				documentId: anamnese.id,
				documentHash,
				certificateId,
				signerId: anamnese.doctorId,
				signerName: anamnese.doctor.user.name,
				signerCRM: anamnese.doctor.crm,
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'] || 'Unknown',
			};

			const signature = signatureService.signDocument(signatureData);

			// Salva no banco
			await signatureRepository.create({
				...signatureData,
				signature,
			});

			// Gera certificado
			const certificate = signatureService.generateCertificate({
				certificateId,
				signedBy: signatureData.signerName,
				signedAt: new Date(),
				documentHash: signatureData.documentHash,
			});

			return res.status(200).send({
				message: 'Anamnese assinada com sucesso',
				data: {
					certificateId,
					signedBy: signatureData.signerName,
					signedAt: new Date(),
					documentHash: signature.documentHash,
					certificate,
				},
			});
		} catch (error) {
			console.error('Error signing anamnese:', error);
			return res.status(500).send({ error: 'Erro interno do servidor' });
		}
	}

	/**
	 * Verifica integridade da anamnese
	 */
	async verifyIntegrity(req: FastifyRequest, res: FastifyReply) {
		try {
			const { id } = req.params as { id: string };

			const anamnese = await anamneseRepository.findById(id);
			if (!anamnese) {
				return res.status(404).send({ error: 'Anamnese não encontrada' });
			}

			const signatures = await signatureRepository.findByDocument('anamnese', id);
			if (!signatures.length) {
				return res.status(404).send({ 
					error: 'Nenhuma assinatura encontrada para esta anamnese' 
				});
			}

			const latestSignature = signatures[0];

			// Recria hash do conteúdo atual
			const documentContent = {
				id: anamnese.id,
				patientId: anamnese.patientId,
				doctorId: anamnese.doctorId,
				appointmentId: anamnese.appointmentId,
				queixaPrincipal: anamnese.queixaPrincipal,
				hdaInicio: anamnese.hdaInicio,
				hdaDuracao: anamnese.hdaDuracao,
				hipoteseDiagnostica: anamnese.hipoteseDiagnostica,
				cid10: anamnese.cid10,
				condutaClinica: anamnese.condutaClinica,
				createdAt: anamnese.createdAt,
			};

			const isValid = signatureService.verifyDocumentIntegrity(
				documentContent,
				latestSignature.documentHash
			);

			return res.status(200).send({
				valid: isValid,
				message: isValid 
					? 'Documento íntegro - não foi alterado após assinatura'
					: '⚠️ ATENÇÃO: Documento foi modificado após assinatura!',
				signature: {
					certificateId: latestSignature.certificateId,
					signedBy: latestSignature.signerName,
					signedAt: latestSignature.signedAt,
					documentHash: latestSignature.documentHash,
				},
			});
		} catch (error) {
			console.error('Error verifying integrity:', error);
			return res.status(500).send({ error: 'Erro ao verificar integridade' });
		}
	}
}
