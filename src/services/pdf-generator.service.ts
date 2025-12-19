import PDFDocument from 'pdfkit'

interface AnamneseWithRelations {
	id: string
	patient: {
		user: {
			name: string
			cpf: string
			email: string
			phone: string
		}
		age: number
		birthDate: Date | null
		gender: string
	}
	doctor: {
		user: {
			name: string
		}
		crm: string
		specialty: string
	}
	appointment?: {
		appointmentDate: Date
		reason: string | null
	} | null
	queixaPrincipal?: string | null
	hdaInicio?: string | null
	hdaDuracao?: string | null
	hdaIntensidade?: string | null
	hdaCaracteristica?: string | null
	hdaLocalizacao?: string | null
	hdaIrradiacao?: string | null
	hdaFatoresMelhora?: string | null
	hdaFatoresPiora?: string | null
	hdaSintomasAssociados?: string | null
	hdaEvolucao?: string | null
	pressaoArterial?: string | null
	frequenciaCardiaca?: string | null
	frequenciaRespiratoria?: string | null
	temperatura?: string | null
	saturacaoO2?: string | null
	peso?: string | null
	altura?: string | null
	imc?: string | null
	historicoMedico?: string | null
	medicamentosEmUso?: string | null
	alergias?: string | null
	historicoFamiliar?: string | null
	habitosVida?: string | null
	revisaoSistemas?: string | null
	examesFisicos?: string | null
	hipoteseDiagnostica?: string | null
	cid10?: string | null
	diagnosticosDiferenciais?: string | null
	condutaClinica?: string | null
	createdAt: Date
	updatedAt: Date
}

interface SignatureData {
	certificateId: string
	signedBy: string
	signedAt: Date
	documentHash: string
	crm?: string
}

export class PDFGeneratorService {
	/**
	 * Gera PDF da anamnese em base64
	 */
	async generateAnamnesePDF(
		anamnese: AnamneseWithRelations,
		signature?: SignatureData
	): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({
					size: 'A4',
					margins: { top: 50, bottom: 50, left: 50, right: 50 },
					bufferPages: true,
				})

				const chunks: Buffer[] = []

				// Coleta os chunks do PDF
				doc.on('data', (chunk) => chunks.push(chunk))
				doc.on('end', () => {
					const pdfBuffer = Buffer.concat(chunks)
					const base64 = pdfBuffer.toString('base64')
					resolve(base64)
				})
				doc.on('error', reject)

				// ========== CABEÇALHO ==========
				this.addHeader(doc, anamnese)
				
				doc.moveDown(1)

				// ========== DADOS DO PACIENTE ==========
				this.addPatientInfo(doc, anamnese)
				
				doc.moveDown(0.5)

				// ========== DADOS DA CONSULTA ==========
				if (anamnese.appointment) {
					this.addAppointmentInfo(doc, anamnese)
					doc.moveDown(0.5)
				}

				// ========== ANAMNESE ==========
				this.addAnamnesis(doc, anamnese)

				// ========== SINAIS VITAIS ==========
				this.addVitalSigns(doc, anamnese)

				// ========== HISTÓRICO ==========
				this.addHistory(doc, anamnese)

				// ========== EXAME FÍSICO E DIAGNÓSTICO ==========
				this.addExamAndDiagnosis(doc, anamnese)

				// ========== ASSINATURA ELETRÔNICA ==========
				if (signature) {
					this.addSignature(doc, anamnese, signature)
				}

				// ========== RODAPÉ ==========
				this.addFooter(doc)

				// Finaliza o PDF
				doc.end()
			} catch (error) {
				reject(error)
			}
		})
	}

	private addHeader(doc: PDFKit.PDFDocument, anamnese: AnamneseWithRelations) {
		// Logo/Título
		doc
			.fontSize(20)
			.font('Helvetica-Bold')
			.text('ANAMNESE MÉDICA', { align: 'center' })

		doc
			.fontSize(10)
			.font('Helvetica')
			.text(`Documento ID: ${anamnese.id}`, { align: 'center' })
			.text(
				`Emitido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
				{ align: 'center' }
			)

		doc.moveDown(0.5)
		this.addLine(doc)
	}

	private addPatientInfo(doc: PDFKit.PDFDocument, anamnese: AnamneseWithRelations) {
		doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO PACIENTE')
		doc.fontSize(10).font('Helvetica')

		const birthDateStr = anamnese.patient.birthDate
			? new Date(anamnese.patient.birthDate).toLocaleDateString('pt-BR')
			: 'Não informado'

		doc
			.text(`Nome: ${anamnese.patient.user.name}`)
			.text(`CPF: ${this.formatCPF(anamnese.patient.user.cpf)}`)
			.text(`Data de Nascimento: ${birthDateStr}`)
			.text(`Idade: ${anamnese.patient.age} anos`)
			.text(`Sexo: ${this.formatGender(anamnese.patient.gender)}`)
			.text(`Telefone: ${anamnese.patient.user.phone}`)
			.text(`Email: ${anamnese.patient.user.email}`)
	}

	private addAppointmentInfo(doc: PDFKit.PDFDocument, anamnese: AnamneseWithRelations) {
		doc.fontSize(12).font('Helvetica-Bold').text('DADOS DA CONSULTA')
		doc.fontSize(10).font('Helvetica')

		doc
			.text(`Médico: ${anamnese.doctor.user.name}`)
			.text(`CRM: ${anamnese.doctor.crm}`)
			.text(`Especialidade: ${anamnese.doctor.specialty}`)

		if (anamnese.appointment) {
			doc
				.text(
					`Data/Hora: ${new Date(anamnese.appointment.appointmentDate).toLocaleString('pt-BR')}`
				)
			if (anamnese.appointment.reason) {
				doc.text(`Motivo: ${anamnese.appointment.reason}`)
			}
		}
	}

	private addAnamnesis(doc: PDFKit.PDFDocument, anamnese: AnamneseWithRelations) {
		const hasAnyData = anamnese.queixaPrincipal || anamnese.hdaInicio || anamnese.hdaDuracao || 
			anamnese.hdaIntensidade || anamnese.hdaCaracteristica || anamnese.hdaLocalizacao

		if (!hasAnyData) return // Não adiciona seção vazia

		this.addLine(doc)
		doc.fontSize(14).font('Helvetica-Bold').text('ANAMNESE')
		doc.moveDown(0.3)

		// Queixa Principal
		if (anamnese.queixaPrincipal) {
			doc.fontSize(11).font('Helvetica-Bold').text('Queixa Principal:')
			doc.fontSize(10).font('Helvetica').text(anamnese.queixaPrincipal)
			doc.moveDown(0.3)
		}

		// História da Doença Atual (HDA)
		const hasHDA = anamnese.hdaInicio || anamnese.hdaDuracao || anamnese.hdaIntensidade
		if (hasHDA) {
			doc.fontSize(11).font('Helvetica-Bold').text('História da Doença Atual (HDA):')
			doc.fontSize(10).font('Helvetica')

			if (anamnese.hdaInicio) doc.text(`• Início: ${anamnese.hdaInicio}`)
			if (anamnese.hdaDuracao) doc.text(`• Duração: ${anamnese.hdaDuracao}`)
			if (anamnese.hdaIntensidade) doc.text(`• Intensidade: ${anamnese.hdaIntensidade}`)
			if (anamnese.hdaCaracteristica) doc.text(`• Característica: ${anamnese.hdaCaracteristica}`)
			if (anamnese.hdaLocalizacao) doc.text(`• Localização: ${anamnese.hdaLocalizacao}`)
			if (anamnese.hdaIrradiacao) doc.text(`• Irradiação: ${anamnese.hdaIrradiacao}`)
			if (anamnese.hdaFatoresMelhora) doc.text(`• Fatores de Melhora: ${anamnese.hdaFatoresMelhora}`)
			if (anamnese.hdaFatoresPiora) doc.text(`• Fatores de Piora: ${anamnese.hdaFatoresPiora}`)
			if (anamnese.hdaSintomasAssociados) doc.text(`• Sintomas Associados: ${anamnese.hdaSintomasAssociados}`)
			if (anamnese.hdaEvolucao) doc.text(`• Evolução: ${anamnese.hdaEvolucao}`)

			doc.moveDown(0.3)
		}
	}

	private addVitalSigns(doc: PDFKit.PDFDocument, anamnese: AnamneseWithRelations) {
		const hasVitalSigns = anamnese.pressaoArterial || anamnese.frequenciaCardiaca || 
			anamnese.temperatura || anamnese.peso || anamnese.saturacaoO2

		if (!hasVitalSigns) return // Não adiciona seção vazia

		this.addLine(doc)
		doc.fontSize(14).font('Helvetica-Bold').text('SINAIS VITAIS')
		doc.moveDown(0.3)
		doc.fontSize(10).font('Helvetica')

			const vitalSigns = [
				{ label: 'Pressão Arterial', value: anamnese.pressaoArterial },
				{ label: 'Frequência Cardíaca', value: anamnese.frequenciaCardiaca },
				{ label: 'Frequência Respiratória', value: anamnese.frequenciaRespiratoria },
				{ label: 'Temperatura', value: anamnese.temperatura },
				{ label: 'Saturação O₂', value: anamnese.saturacaoO2 },
				{ label: 'Peso', value: anamnese.peso },
				{ label: 'Altura', value: anamnese.altura },
				{ label: 'IMC', value: anamnese.imc },
			]

			vitalSigns.forEach(({ label, value }) => {
				if (value) {
					doc.text(`${label}: ${value}`)
				}
			})

			doc.moveDown(0.3)
		}

	private addHistory(doc: PDFKit.PDFDocument, anamnese: AnamneseWithRelations) {
		const hasHistory = anamnese.historicoMedico || anamnese.medicamentosEmUso || 
			anamnese.alergias || anamnese.historicoFamiliar || anamnese.habitosVida

		if (!hasHistory) return // Não adiciona seção vazia

		this.addLine(doc)
		doc.fontSize(14).font('Helvetica-Bold').text('HISTÓRICO MÉDICO')
		doc.moveDown(0.3)

		if (anamnese.historicoMedico) {
			doc.fontSize(11).font('Helvetica-Bold').text('Histórico Médico:')
			doc.fontSize(10).font('Helvetica').text(anamnese.historicoMedico)
			doc.moveDown(0.3)
		}

		if (anamnese.medicamentosEmUso) {
			doc.fontSize(11).font('Helvetica-Bold').text('Medicamentos em Uso:')
			doc.fontSize(10).font('Helvetica').text(anamnese.medicamentosEmUso)
			doc.moveDown(0.3)
		}

		if (anamnese.alergias) {
			doc.fontSize(11).font('Helvetica-Bold').text('Alergias:')
			doc.fontSize(10).font('Helvetica').text(anamnese.alergias)
			doc.moveDown(0.3)
		}

		if (anamnese.historicoFamiliar) {
			doc.fontSize(11).font('Helvetica-Bold').text('Histórico Familiar:')
			doc.fontSize(10).font('Helvetica').text(anamnese.historicoFamiliar)
			doc.moveDown(0.3)
		}

		if (anamnese.habitosVida) {
			doc.fontSize(11).font('Helvetica-Bold').text('Hábitos de Vida:')
			doc.fontSize(10).font('Helvetica').text(anamnese.habitosVida)
			doc.moveDown(0.3)
		}
	}

	private addExamAndDiagnosis(doc: PDFKit.PDFDocument, anamnese: AnamneseWithRelations) {
		const hasExamData = anamnese.revisaoSistemas || anamnese.examesFisicos || 
			anamnese.hipoteseDiagnostica || anamnese.condutaClinica

		if (!hasExamData) return // Não adiciona seção vazia

		this.addLine(doc)
		doc.fontSize(14).font('Helvetica-Bold').text('EXAME FÍSICO E DIAGNÓSTICO')
		doc.moveDown(0.3)

		if (anamnese.revisaoSistemas) {
			doc.fontSize(11).font('Helvetica-Bold').text('Revisão de Sistemas:')
			doc.fontSize(10).font('Helvetica').text(anamnese.revisaoSistemas)
			doc.moveDown(0.3)
		}

		if (anamnese.examesFisicos) {
			doc.fontSize(11).font('Helvetica-Bold').text('Exames Físicos:')
			doc.fontSize(10).font('Helvetica').text(anamnese.examesFisicos)
			doc.moveDown(0.3)
		}

		if (anamnese.hipoteseDiagnostica) {
			doc.fontSize(11).font('Helvetica-Bold').text('Hipótese Diagnóstica:')
			doc.fontSize(10).font('Helvetica').text(anamnese.hipoteseDiagnostica)
			if (anamnese.cid10) {
				doc.text(`CID-10: ${anamnese.cid10}`)
			}
			doc.moveDown(0.3)
		}

		if (anamnese.diagnosticosDiferenciais) {
			doc.fontSize(11).font('Helvetica-Bold').text('Diagnósticos Diferenciais:')
			doc.fontSize(10).font('Helvetica').text(anamnese.diagnosticosDiferenciais)
			doc.moveDown(0.3)
		}

		if (anamnese.condutaClinica) {
			doc.fontSize(11).font('Helvetica-Bold').text('Conduta Clínica:')
			doc.fontSize(10).font('Helvetica').text(anamnese.condutaClinica)
			doc.moveDown(0.3)
		}
	}

	private addSignature(
		doc: PDFKit.PDFDocument,
		anamnese: AnamneseWithRelations,
		signature: SignatureData
	) {
		// Adiciona nova página se necessário
		if (doc.y > 650) {
			doc.addPage()
		}

		this.addLine(doc)
		doc.fontSize(12).font('Helvetica-Bold').text('ASSINATURA ELETRÔNICA', { align: 'center' })
		doc.moveDown(0.5)

		doc.fontSize(9).font('Helvetica')
		doc
			.text(`Documento assinado eletronicamente por:`, { align: 'left' })
			.text(`${signature.signedBy}${signature.crm ? ` - CRM: ${signature.crm}` : ''}`)
			.text(
				`Data/Hora: ${new Date(signature.signedAt).toLocaleString('pt-BR', {
					timeZone: 'America/Sao_Paulo',
				})}`
			)
			.moveDown(0.3)
			.text(`Certificado ID: ${signature.certificateId}`)
			.text(`Hash do Documento: ${signature.documentHash.substring(0, 32)}...`)
			.moveDown(0.5)
			.fontSize(8)
			.text('Este documento possui assinatura eletrônica conforme Lei 14.063/2020', {
				align: 'center',
			})
			.text('e Resolução CFM nº 1.821/2007 (Prontuário Eletrônico)', { align: 'center' })
	}

	private addFooter(doc: PDFKit.PDFDocument) {
		const pages = doc.bufferedPageRange()
		
		for (let i = 0; i < pages.count; i++) {
			doc.switchToPage(i)

			doc
				.fontSize(8)
				.font('Helvetica')
				.text(
					`Página ${i + 1} de ${pages.count}`,
					50,
					doc.page.height - 30,
					{ align: 'center' }
				)
		}
	}

	private addLine(doc: PDFKit.PDFDocument) {
		doc
			.moveTo(50, doc.y)
			.lineTo(doc.page.width - 50, doc.y)
			.stroke()
		doc.moveDown(0.5)
	}

	private formatCPF(cpf: string): string {
		return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
	}

	private formatGender(gender: string): string {
		const genders: Record<string, string> = {
			male: 'Masculino',
			female: 'Feminino',
			other: 'Outro',
		}
		return genders[gender] || gender
	}

	/**
	 * Gera PDF da prescrição médica em base64
	 */
	async generatePrescriptionPDF(
		prescription: any,
		signature?: SignatureData
	): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({
					size: 'A4',
					margins: { top: 50, bottom: 50, left: 50, right: 50 },
					bufferPages: true,
				})

				const chunks: Buffer[] = []

				doc.on('data', (chunk) => chunks.push(chunk))
				doc.on('end', () => {
					const pdfBuffer = Buffer.concat(chunks)
					const base64 = pdfBuffer.toString('base64')
					resolve(base64)
				})
				doc.on('error', reject)

				// ========== CABEÇALHO ==========
				doc
					.fontSize(20)
					.font('Helvetica-Bold')
					.text('PRESCRIÇÃO MÉDICA', { align: 'center' })

				doc
					.fontSize(10)
					.font('Helvetica')
					.text(`Documento ID: ${prescription.id}`, { align: 'center' })
					.text(
						`Emitido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
						{ align: 'center' }
					)

				doc.moveDown(0.5)
				this.addLine(doc)

				// ========== DADOS DO MÉDICO ==========
				doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO MÉDICO')
				doc.fontSize(10).font('Helvetica')
				doc
					.text(`Nome: ${prescription.doctor.user.name}`)
					.text(`CRM: ${prescription.doctor.crm}`)
					.text(`Especialidade: ${prescription.doctor.specialty}`)

				doc.moveDown(0.5)
				this.addLine(doc)

				// ========== DADOS DO PACIENTE ==========
				doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO PACIENTE')
				doc.fontSize(10).font('Helvetica')
				doc
					.text(`Nome: ${prescription.patient.user.name}`)
					.text(`CPF: ${this.formatCPF(prescription.patient.user.cpf)}`)
					.text(`Idade: ${prescription.patient.age} anos`)
					.text(`Sexo: ${this.formatGender(prescription.patient.gender)}`)

				doc.moveDown(0.5)
				this.addLine(doc)

				// ========== MEDICAMENTOS ==========
				doc.fontSize(14).font('Helvetica-Bold').text('MEDICAMENTOS PRESCRITOS')
				doc.moveDown(0.5)

				prescription.medicamentos.forEach((med: any, index: number) => {
					doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${med.nome}`)
					doc.fontSize(10).font('Helvetica')
					doc.text(`   Dosagem: ${med.dosagem}`)
					doc.text(`   Frequência: ${med.frequencia}`)
					doc.text(`   Duração: ${med.duracao}`)
					doc.text(`   Via: ${med.via}`)
					if (med.orientacoes) {
						doc.text(`   Orientações: ${med.orientacoes}`)
					}
					doc.moveDown(0.3)
				})

				// ========== ORIENTAÇÕES GERAIS ==========
				if (prescription.orientacoesGerais) {
					doc.moveDown(0.5)
					this.addLine(doc)
					doc.fontSize(12).font('Helvetica-Bold').text('ORIENTAÇÕES GERAIS')
					doc.fontSize(10).font('Helvetica').text(prescription.orientacoesGerais)
				}

				// ========== DATA ==========
				doc.moveDown(1)
				doc.fontSize(10).font('Helvetica')
				doc.text(
					`Data da Prescrição: ${new Date(prescription.createdAt).toLocaleDateString('pt-BR')}`,
					{ align: 'right' }
				)

				// ========== ASSINATURA ELETRÔNICA ==========
				if (signature) {
					if (doc.y > 650) {
						doc.addPage()
					}
					this.addPrescriptionSignature(doc, prescription, signature)
				}

				// ========== RODAPÉ ==========
				this.addFooter(doc)

				doc.end()
			} catch (error) {
				reject(error)
			}
		})
	}

	/**
	 * Gera PDF da solicitação de exame em base64
	 */
	async generateRequestPDF(
		request: any,
		signature?: SignatureData
	): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({
					size: 'A4',
					margins: { top: 50, bottom: 50, left: 50, right: 50 },
					bufferPages: true,
				})

				const chunks: Buffer[] = []

				doc.on('data', (chunk) => chunks.push(chunk))
				doc.on('end', () => {
					const pdfBuffer = Buffer.concat(chunks)
					const base64 = pdfBuffer.toString('base64')
					resolve(base64)
				})
				doc.on('error', reject)

				// Determina o título baseado no tipo
				const details = request.details as any
				let titulo = 'SOLICITAÇÃO MÉDICA'
				
				if (details?.tipo) {
					const tipoLower = details.tipo.toLowerCase()
					if (tipoLower.includes('exame')) {
						titulo = 'SOLICITAÇÃO DE EXAME'
					} else if (tipoLower.includes('consulta')) {
						titulo = 'SOLICITAÇÃO DE CONSULTA'
					} else if (tipoLower.includes('cirurgia')) {
						titulo = 'SOLICITAÇÃO DE CIRURGIA'
					} else if (tipoLower.includes('internação') || tipoLower.includes('internacao')) {
						titulo = 'SOLICITAÇÃO DE INTERNAÇÃO'
					} else if (tipoLower.includes('procedimento')) {
						titulo = 'SOLICITAÇÃO DE PROCEDIMENTO'
					} else if (tipoLower.includes('medicamento') || tipoLower.includes('receita')) {
						titulo = 'SOLICITAÇÃO DE MEDICAMENTO'
					}
				}

				// ========== CABEÇALHO ==========
				doc
					.fontSize(20)
					.font('Helvetica-Bold')
					.text(titulo, { align: 'center' })

				doc
					.fontSize(10)
					.font('Helvetica')
					.text(`Documento ID: ${request.id}`, { align: 'center' })
					.text(
						`Emitido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
						{ align: 'center' }
					)

				doc.moveDown(0.5)
				this.addLine(doc)

				// ========== DADOS DO MÉDICO ==========
				doc.fontSize(12).font('Helvetica-Bold').text('MÉDICO SOLICITANTE')
				doc.fontSize(10).font('Helvetica')
				doc
					.text(`Nome: ${request.doctor.user.name}`)
					.text(`CRM: ${request.doctor.crm}`)
					.text(`Especialidade: ${request.doctor.specialty}`)

				doc.moveDown(0.5)
				this.addLine(doc)

				// ========== DADOS DO PACIENTE ==========
				doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO PACIENTE')
				doc.fontSize(10).font('Helvetica')
				doc
					.text(`Nome: ${request.patient.user.name}`)
					.text(`CPF: ${this.formatCPF(request.patient.user.cpf)}`)
					.text(`Idade: ${request.patient.age} anos`)
					.text(`Sexo: ${this.formatGender(request.patient.gender)}`)

				doc.moveDown(0.5)
				this.addLine(doc)

				// ========== SOLICITAÇÃO ==========
				doc.fontSize(14).font('Helvetica-Bold').text('DETALHES DA SOLICITAÇÃO')
				doc.moveDown(0.5)

				if (details.tipo) {
					doc.fontSize(11).font('Helvetica-Bold').text(`Tipo: ${details.tipo}`)
					doc.moveDown(0.2)
				}
				
				doc.fontSize(10).font('Helvetica')
				if (details.descricao) {
					doc.font('Helvetica-Bold').text('Descrição:', { continued: false })
					doc.font('Helvetica').text(details.descricao)
					doc.moveDown(0.3)
				}
				if (details.observacoes) {
					doc.font('Helvetica-Bold').text('Observações:', { continued: false })
					doc.font('Helvetica').text(details.observacoes)
					doc.moveDown(0.3)
				}

				// ========== DATA ==========
				doc.moveDown(1)
				doc.fontSize(10).font('Helvetica')
				doc.text(
					`Data da Solicitação: ${new Date(request.createdAt).toLocaleDateString('pt-BR')}`,
					{ align: 'right' }
				)

				// ========== ASSINATURA ELETRÔNICA ==========
				if (signature) {
					if (doc.y > 650) {
						doc.addPage()
					}
					this.addRequestSignature(doc, request, signature)
				}

				// ========== RODAPÉ ==========
				this.addFooter(doc)

				doc.end()
			} catch (error) {
				reject(error)
			}
		})
	}

	private addPrescriptionSignature(
		doc: PDFKit.PDFDocument,
		prescription: any,
		signature: SignatureData
	) {
		this.addLine(doc)
		doc.fontSize(12).font('Helvetica-Bold').text('ASSINATURA ELETRÔNICA', { align: 'center' })
		doc.moveDown(0.5)

		doc.fontSize(9).font('Helvetica')
		doc
			.text(`Documento assinado eletronicamente por:`, { align: 'left' })
			.text(`${prescription.doctor.user.name} - CRM: ${prescription.doctor.crm}`)
			.text(
				`Data/Hora: ${new Date(signature.signedAt).toLocaleString('pt-BR', {
					timeZone: 'America/Sao_Paulo',
				})}`
			)
			.moveDown(0.3)
			.text(`Certificado ID: ${signature.certificateId}`)
			.text(`Hash do Documento: ${signature.documentHash.substring(0, 32)}...`)
			.moveDown(0.5)
			.fontSize(8)
			.text('Este documento possui assinatura eletrônica conforme Lei 14.063/2020', {
				align: 'center',
			})
			.text('e Resolução CFM nº 1.821/2007', { align: 'center' })
	}

	private addRequestSignature(
		doc: PDFKit.PDFDocument,
		request: any,
		signature: SignatureData
	) {
		this.addLine(doc)
		doc.fontSize(12).font('Helvetica-Bold').text('ASSINATURA ELETRÔNICA', { align: 'center' })
		doc.moveDown(0.5)

		doc.fontSize(9).font('Helvetica')
		doc
			.text(`Documento assinado eletronicamente por:`, { align: 'left' })
			.text(`${request.doctor.user.name} - CRM: ${request.doctor.crm}`)
			.text(
				`Data/Hora: ${new Date(signature.signedAt).toLocaleString('pt-BR', {
					timeZone: 'America/Sao_Paulo',
				})}`
			)
			.moveDown(0.3)
			.text(`Certificado ID: ${signature.certificateId}`)
			.text(`Hash do Documento: ${signature.documentHash.substring(0, 32)}...`)
			.moveDown(0.5)
			.fontSize(8)
			.text('Este documento possui assinatura eletrônica conforme Lei 14.063/2020', {
				align: 'center',
			})
			.text('e Resolução CFM nº 1.821/2007', { align: 'center' })
	}
}

export const pdfGeneratorService = new PDFGeneratorService()
