import path from 'node:path'
import PDFDocument from 'pdfkit'
import { REQUEST_TYPE_OPTIONS } from '../modules/request/request.schema'

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
	crm?: string | null
}

interface Field {
	label: string
	value: string | number | null | undefined
}

interface SignatureBlock {
	signerName: string
	crm?: string | null
	specialty?: string | null
	signedAt: Date
	certificateId?: string
	documentHash?: string
	legalNote: string
}

type PDFDoc = PDFKit.PDFDocument

const ASSETS_DIR = path.resolve(__dirname, '../../assets')
const LOGO_PATH = path.join(ASSETS_DIR, 'logo.png')

const FONT = {
	regular: 'Inter',
	medium: 'Inter-Medium',
	semibold: 'Inter-SemiBold',
} as const

const COLOR = {
	ink: '#000000',
	line: '#E6E1D7',
	accent: '#000000',
} as const

const LAYOUT = {
	marginX: 56,
	marginTop: 88,
	marginBottom: 64,
	hairline: 0.5,
	fieldGap: 18,
	lineStep: 15,
	blockGap: 6,
	labelSize: 8,
	valueSize: 9,
} as const

/** Rótulos dos tipos legados (aliases aceitos em `request.schema.ts`). */
const LEGACY_REQUEST_TYPE_LABELS: Record<string, string> = {
	exame: 'Exame',
	procedimento: 'Procedimento',
	interconsulta: 'Interconsulta',
	atestado_medico: 'Atestado médico',
	declaracao_comparecimento: 'Declaração de comparecimento',
}

/** Títulos de documento por tipo; `other` e tipos desconhecidos caem no fallback. */
const REQUEST_TITLES: Record<string, string> = {
	appointment: 'Solicitação de consulta',
	prescription: 'Solicitação de prescrição',
	consultation: 'Solicitação de consulta médica',
	utiAdmission: 'Solicitação de internação em UTI',
	medicalCertificate: 'Atestado médico',
	attendanceDeclaration: 'Declaração de comparecimento',
	exame: 'Solicitação de exame',
	procedimento: 'Solicitação de procedimento',
	interconsulta: 'Solicitação de interconsulta',
	atestado_medico: 'Atestado médico',
	declaracao_comparecimento: 'Declaração de comparecimento',
}

const LEGAL_NOTE = 'Assinatura eletrônica conforme Lei 14.063/2020 e Resolução CFM nº 1.821/2007.'

export class PDFGeneratorService {
	// ========== INFRAESTRUTURA ==========

	/**
	 * Cria o documento, executa o `build` e devolve o PDF em base64.
	 * Cabeçalho e rodapé são aplicados a todas as páginas ao final.
	 */
	private render(headerLabel: string, footerLabel: string, build: (doc: PDFDoc) => void): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({
					size: 'A4',
					margins: {
						top: LAYOUT.marginTop,
						bottom: LAYOUT.marginBottom,
						left: LAYOUT.marginX,
						right: LAYOUT.marginX,
					},
					bufferPages: true,
					info: { Title: headerLabel, Producer: 'Amparo Telemedicina' },
				})

				doc.registerFont(FONT.regular, path.join(ASSETS_DIR, 'fonts/inter-latin-400-normal.woff'))
				doc.registerFont(FONT.medium, path.join(ASSETS_DIR, 'fonts/inter-latin-500-normal.woff'))
				doc.registerFont(FONT.semibold, path.join(ASSETS_DIR, 'fonts/inter-latin-600-normal.woff'))

				const chunks: Buffer[] = []
				doc.on('data', (chunk: Buffer) => chunks.push(chunk))
				doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')))
				doc.on('error', reject)

				build(doc)
				this.decoratePages(doc, headerLabel, footerLabel)
				doc.end()
			} catch (error) {
				reject(error)
			}
		})
	}

	/** Aplica cabeçalho (logo + marca) e rodapé (identificação + paginação) em todas as páginas. */
	private decoratePages(doc: PDFDoc, headerLabel: string, footerLabel: string) {
		const { count } = doc.bufferedPageRange()
		const left = LAYOUT.marginX
		const width = doc.page.width - LAYOUT.marginX * 2

		for (let i = 0; i < count; i++) {
			doc.switchToPage(i)
			const page = doc.page
			const originalBottom = page.margins.bottom
			page.margins.bottom = 0 // evita que o rodapé dispare nova página

			// Cabeçalho
			doc.image(LOGO_PATH, left, 32, { height: 30 })
			doc
				.font(FONT.semibold)
				.fontSize(12)
				.fillColor(COLOR.ink)
				.text('Amparo', left + 30, 36, { lineBreak: false })
			doc
				.font(FONT.medium)
				.fontSize(6.5)
				.fillColor(COLOR.accent)
				.text('TELEMEDICINA', left + 30, 51, { characterSpacing: 1.6, lineBreak: false })
			doc
				.font(FONT.regular)
				.fontSize(8)
				.fillColor(COLOR.ink)
				.text(headerLabel, left, 44, { width, align: 'right', lineBreak: false })
			this.rule(doc, 72)

			// Rodapé
			const footerY = page.height - 44
			this.rule(doc, footerY - 10)
			doc
				.font(FONT.regular)
				.fontSize(7.5)
				.fillColor(COLOR.ink)
				.text(footerLabel, left, footerY, { width: width - 80, align: 'left', lineBreak: false })
				.text(`Página ${i + 1} de ${count}`, left, footerY, { width, align: 'right', lineBreak: false })

			page.margins.bottom = originalBottom
		}
	}

	// ========== PRIMITIVAS DE LAYOUT ==========

	private rule(doc: PDFDoc, y: number) {
		doc
			.save()
			.lineWidth(LAYOUT.hairline)
			.strokeColor(COLOR.line)
			.moveTo(LAYOUT.marginX, y)
			.lineTo(doc.page.width - LAYOUT.marginX, y)
			.stroke()
			.restore()
	}

	private contentWidth(doc: PDFDoc): number {
		return doc.page.width - LAYOUT.marginX * 2
	}

	private ensureSpace(doc: PDFDoc, height: number) {
		if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
			doc.addPage()
		}
	}

	/** Título do documento + linha de metadados discreta. */
	private titleBlock(doc: PDFDoc, title: string, meta: string[]) {
		doc.font(FONT.semibold).fontSize(16).fillColor(COLOR.ink).text(title, LAYOUT.marginX, doc.y)
		doc.y += 2
		doc
			.font(FONT.regular)
			.fontSize(8.5)
			.fillColor(COLOR.ink)
			.text(meta.filter(Boolean).join('  ·  '), LAYOUT.marginX, doc.y)
		doc.y += 2
	}

	/** Título de seção: caixa-alta pequena em dourado, com fio fino abaixo. */
	private section(doc: PDFDoc, label: string) {
		this.ensureSpace(doc, 50)
		doc.y += 12
		doc
			.font(FONT.semibold)
			.fontSize(8)
			.fillColor(COLOR.accent)
			.text(label.toUpperCase(), LAYOUT.marginX, doc.y, { characterSpacing: 1.2 })
		doc.y += 4
		this.rule(doc, doc.y)
		doc.y += 7
	}

	private subheading(doc: PDFDoc, label: string) {
		this.ensureSpace(doc, 40)
		doc.font(FONT.semibold).fontSize(9.5).fillColor(COLOR.ink).text(label, LAYOUT.marginX, doc.y)
		doc.y += 6
	}

	private hasValue(value: Field['value']): boolean {
		return value !== null && value !== undefined && String(value).trim() !== ''
	}

	/**
	 * Campos "Rótulo: valor" em fluxo inline: vários por linha, quebrando só quando a
	 * linha acaba. Valores que não cabem em uma linha viram bloco (rótulo + texto).
	 */
	private fields(doc: PDFDoc, items: Field[]) {
		const visible = items.filter((item) => this.hasValue(item.value))
		if (visible.length === 0) return

		const left = LAYOUT.marginX
		const right = doc.page.width - LAYOUT.marginX
		const width = right - left
		let x = left
		let y = doc.y
		let lineOpen = false

		const endLine = () => {
			if (!lineOpen) return
			y += LAYOUT.lineStep
			x = left
			lineOpen = false
		}
		const reserve = (height: number) => {
			doc.y = y
			this.ensureSpace(doc, height)
			if (doc.y !== y) {
				y = doc.y
				x = left
			}
		}

		for (const item of visible) {
			const label = `${item.label}:`
			const text = String(item.value).trim()

			doc.font(FONT.medium).fontSize(LAYOUT.labelSize)
			const labelWidth = doc.widthOfString(label) + 4
			doc.font(FONT.regular).fontSize(LAYOUT.valueSize)
			const total = labelWidth + doc.widthOfString(text)

			if (!text.includes('\n') && total <= width) {
				if (lineOpen && x + total > right) endLine()
				reserve(LAYOUT.lineStep)
				doc.font(FONT.medium).fontSize(LAYOUT.labelSize).fillColor(COLOR.ink).text(label, x, y + 0.5, { lineBreak: false })
				doc.font(FONT.regular).fontSize(LAYOUT.valueSize).fillColor(COLOR.ink).text(text, x + labelWidth, y, { lineBreak: false })
				x += total + LAYOUT.fieldGap
				lineOpen = true
			} else {
				endLine()
				reserve(40)
				doc.font(FONT.medium).fontSize(LAYOUT.labelSize).fillColor(COLOR.ink).text(label, left, y, { width })
				doc.font(FONT.regular).fontSize(LAYOUT.valueSize).fillColor(COLOR.ink).text(text, left, doc.y + 1, { width, lineGap: 1 })
				y = doc.y + LAYOUT.blockGap
			}
		}

		endLine()
		doc.x = left
		doc.y = y
	}

	private signatureBlock(doc: PDFDoc, signature: SignatureBlock) {
		this.ensureSpace(doc, 110)
		doc.y += 4
		this.section(doc, 'Assinatura eletrônica')

		const signer = signature.crm ? `${signature.signerName} · CRM ${signature.crm}` : signature.signerName
		this.fields(doc, [
			{ label: 'Assinado por', value: signer },
			{ label: 'Especialidade', value: signature.specialty },
			{ label: 'Data e hora', value: this.formatDateTime(signature.signedAt) },
			{ label: 'Certificado', value: signature.certificateId },
			{ label: 'Hash do documento', value: signature.documentHash ? `${signature.documentHash.substring(0, 32)}…` : null },
		])

		doc.y += 1
		doc.font(FONT.regular).fontSize(7.5).fillColor(COLOR.ink).text(signature.legalNote, LAYOUT.marginX, doc.y)
	}

	private doctorSignature(doc: PDFDoc, doctor: any) {
		this.signatureBlock(doc, {
			signerName: doctor.user.name,
			crm: doctor.crm,
			specialty: doctor.specialty,
			signedAt: new Date(),
			legalNote: LEGAL_NOTE,
		})
	}

	// ========== BLOCOS COMPARTILHADOS ==========

	private patientSection(doc: PDFDoc, patient: any, extended = false) {
		this.section(doc, 'Paciente')
		const fields: Field[] = [
			{ label: 'Nome', value: patient.user.name },
			{ label: 'CPF', value: this.formatCPF(patient.user.cpf) },
		]
		if (extended) {
			fields.push({
				label: 'Data de nascimento',
				value: patient.birthDate ? this.formatDate(patient.birthDate) : 'Não informado',
			})
		}
		fields.push(
			{ label: 'Idade', value: `${patient.age} anos` },
			{ label: 'Sexo', value: this.formatGender(patient.gender) }
		)
		if (extended) {
			fields.push(
				{ label: 'Telefone', value: patient.user.phone },
				{ label: 'E-mail', value: patient.user.email }
			)
		}
		this.fields(doc, fields)
	}

	private doctorSection(doc: PDFDoc, label: string, doctor: any) {
		this.section(doc, label)
		this.fields(doc, [
			{ label: 'Nome', value: doctor.user.name },
			{ label: 'CRM', value: doctor.crm },
			{ label: 'Especialidade', value: doctor.specialty },
		])
	}

	private prescriptionBody(doc: PDFDoc, prescription: any) {
		this.section(doc, 'Medicamentos prescritos')

		const medications: any[] = prescription.medicamentos ?? []
		if (medications.length === 0) {
			doc.font(FONT.regular).fontSize(10).fillColor(COLOR.ink).text('Nenhum medicamento prescrito', LAYOUT.marginX, doc.y)
			doc.y += LAYOUT.blockGap
		}

		medications.forEach((med, index) => {
			this.ensureSpace(doc, 90)
			doc
				.font(FONT.semibold)
				.fontSize(11)
				.fillColor(COLOR.ink)
				.text(`${index + 1}. ${med.nome}`, LAYOUT.marginX, doc.y)
			doc.y += 6
			this.fields(doc, [
				{ label: 'Dosagem', value: med.dosagem },
				{ label: 'Frequência', value: med.frequencia },
				{ label: 'Duração', value: med.duracao },
				{ label: 'Via', value: med.via },
				{ label: 'Orientações', value: med.orientacoes },
			])
			if (index < medications.length - 1) {
				this.rule(doc, doc.y)
				doc.y += 12
			}
		})

		if (prescription.orientacoesGerais) {
			this.section(doc, 'Orientações gerais')
			this.fields(doc, [{ label: 'Orientações', value: prescription.orientacoesGerais }])
		}
	}

	/** Traduz o valor técnico de `details.tipo` (ex.: medicalCertificate) para português. */
	private requestTypeLabel(tipo: unknown): string | null {
		if (!tipo) return null
		const value = String(tipo)
		return (
			REQUEST_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
			LEGACY_REQUEST_TYPE_LABELS[value] ??
			value
		)
	}

	private requestTitle(details: any): string {
		const rawTipo = String(details?.tipo ?? '')
		if (REQUEST_TITLES[rawTipo]) return REQUEST_TITLES[rawTipo]

		const tipo = rawTipo.toLowerCase()
		if (tipo.includes('exame')) return 'Solicitação de exame'
		if (tipo.includes('consulta')) return 'Solicitação de consulta'
		if (tipo.includes('cirurgia')) return 'Solicitação de cirurgia'
		if (tipo.includes('internação') || tipo.includes('internacao')) return 'Solicitação de internação'
		if (tipo.includes('procedimento')) return 'Solicitação de procedimento'
		if (tipo.includes('medicamento') || tipo.includes('receita')) return 'Solicitação de medicamento'
		return 'Solicitação médica'
	}

	private requestBody(doc: PDFDoc, details: any) {
		this.section(doc, 'Detalhes da solicitação')
		this.fields(doc, [
			{ label: 'Tipo', value: this.requestTypeLabel(details?.tipo) },
			{ label: 'Descrição', value: details?.descricao },
			{ label: 'Observações', value: details?.observacoes },
		])
	}

	// ========== ANAMNESE ==========

	/**
	 * Gera PDF da anamnese em base64
	 */
	async generateAnamnesePDF(anamnese: AnamneseWithRelations, signature?: SignatureData): Promise<string> {
		return this.render('Anamnese médica', `Documento ${anamnese.id}`, (doc) => {
			this.titleBlock(doc, 'Anamnese médica', [`ID ${anamnese.id}`, `Emitido em ${this.formatDateTime(new Date())}`])

			this.patientSection(doc, anamnese.patient, true)

			if (anamnese.appointment) {
				this.section(doc, 'Consulta')
				this.fields(doc, [
					{ label: 'Médico', value: anamnese.doctor.user.name },
					{ label: 'CRM', value: anamnese.doctor.crm },
					{ label: 'Especialidade', value: anamnese.doctor.specialty },
					{ label: 'Data e hora', value: this.formatDateTime(anamnese.appointment.appointmentDate) },
					{ label: 'Motivo', value: anamnese.appointment.reason },
				])
			}

			this.addAnamnesis(doc, anamnese)
			this.addVitalSigns(doc, anamnese)
			this.addHistory(doc, anamnese)
			this.addExamAndDiagnosis(doc, anamnese)

			if (signature) {
				this.signatureBlock(doc, {
					signerName: signature.signedBy,
					crm: signature.crm,
					signedAt: signature.signedAt,
					certificateId: signature.certificateId,
					documentHash: signature.documentHash,
					legalNote: `${LEGAL_NOTE} Prontuário eletrônico.`,
				})
			}
		})
	}

	private addAnamnesis(doc: PDFDoc, anamnese: AnamneseWithRelations) {
		const hdaFields: Field[] = [
			{ label: 'Início', value: anamnese.hdaInicio },
			{ label: 'Duração', value: anamnese.hdaDuracao },
			{ label: 'Intensidade', value: anamnese.hdaIntensidade },
			{ label: 'Característica', value: anamnese.hdaCaracteristica },
			{ label: 'Localização', value: anamnese.hdaLocalizacao },
			{ label: 'Irradiação', value: anamnese.hdaIrradiacao },
			{ label: 'Fatores de melhora', value: anamnese.hdaFatoresMelhora },
			{ label: 'Fatores de piora', value: anamnese.hdaFatoresPiora },
			{ label: 'Sintomas associados', value: anamnese.hdaSintomasAssociados },
			{ label: 'Evolução', value: anamnese.hdaEvolucao },
		]
		const hasHDA = hdaFields.some((field) => this.hasValue(field.value))
		if (!anamnese.queixaPrincipal && !hasHDA) return

		this.section(doc, 'Anamnese')
		this.fields(doc, [{ label: 'Queixa principal', value: anamnese.queixaPrincipal }])
		if (hasHDA) {
			this.subheading(doc, 'História da doença atual')
			this.fields(doc, hdaFields)
		}
	}

	private addVitalSigns(doc: PDFDoc, anamnese: AnamneseWithRelations) {
		const vitals: Field[] = [
			{ label: 'Pressão arterial', value: anamnese.pressaoArterial },
			{ label: 'Frequência cardíaca', value: anamnese.frequenciaCardiaca },
			{ label: 'Frequência respiratória', value: anamnese.frequenciaRespiratoria },
			{ label: 'Temperatura', value: anamnese.temperatura },
			{ label: 'Saturação O2', value: anamnese.saturacaoO2 },
			{ label: 'Peso', value: anamnese.peso },
			{ label: 'Altura', value: anamnese.altura },
			{ label: 'IMC', value: anamnese.imc },
		]
		if (!vitals.some((field) => this.hasValue(field.value))) return

		this.section(doc, 'Sinais vitais')
		this.fields(doc, vitals)
	}

	private addHistory(doc: PDFDoc, anamnese: AnamneseWithRelations) {
		const items: Field[] = [
			{ label: 'Histórico médico', value: anamnese.historicoMedico },
			{ label: 'Medicamentos em uso', value: anamnese.medicamentosEmUso },
			{ label: 'Alergias', value: anamnese.alergias },
			{ label: 'Histórico familiar', value: anamnese.historicoFamiliar },
			{ label: 'Hábitos de vida', value: anamnese.habitosVida },
		]
		if (!items.some((field) => this.hasValue(field.value))) return

		this.section(doc, 'Histórico médico')
		this.fields(doc, items)
	}

	private addExamAndDiagnosis(doc: PDFDoc, anamnese: AnamneseWithRelations) {
		const hypothesis = anamnese.hipoteseDiagnostica
			? anamnese.cid10
				? `${anamnese.hipoteseDiagnostica}\nCID-10: ${anamnese.cid10}`
				: anamnese.hipoteseDiagnostica
			: null

		const items: Field[] = [
			{ label: 'Revisão de sistemas', value: anamnese.revisaoSistemas },
			{ label: 'Exames físicos', value: anamnese.examesFisicos },
			{ label: 'Hipótese diagnóstica', value: hypothesis },
			{ label: 'Diagnósticos diferenciais', value: anamnese.diagnosticosDiferenciais },
			{ label: 'Conduta clínica', value: anamnese.condutaClinica },
		]
		if (!items.some((field) => this.hasValue(field.value))) return

		this.section(doc, 'Exame físico e diagnóstico')
		this.fields(doc, items)
	}

	// ========== PRESCRIÇÃO ==========

	/**
	 * Gera PDF da prescrição médica em base64
	 */
	async generatePrescriptionPDF(prescription: any, signature?: SignatureData): Promise<string> {
		return this.render('Prescrição médica', `Documento ${prescription.id}`, (doc) => {
			this.titleBlock(doc, 'Prescrição médica', [
				`ID ${prescription.id}`,
				`Emitido em ${this.formatDateTime(new Date())}`,
			])

			this.doctorSection(doc, 'Médico', prescription.doctor)
			this.patientSection(doc, prescription.patient)
			this.prescriptionBody(doc, prescription)

			doc.y += 6
			doc
				.font(FONT.regular)
				.fontSize(9)
				.fillColor(COLOR.ink)
				.text(`Data da prescrição: ${this.formatDate(prescription.createdAt)}`, LAYOUT.marginX, doc.y, {
					width: this.contentWidth(doc),
					align: 'right',
				})

			if (signature) {
				this.signatureBlock(doc, {
					signerName: prescription.doctor.user.name,
					crm: prescription.doctor.crm,
					signedAt: signature.signedAt,
					certificateId: signature.certificateId,
					documentHash: signature.documentHash,
					legalNote: LEGAL_NOTE,
				})
			}
		})
	}

	// ========== SOLICITAÇÃO ==========

	/**
	 * Gera PDF da solicitação de exame em base64
	 */
	async generateRequestPDF(request: any, signature?: SignatureData): Promise<string> {
		const details = request.details as any
		const title = this.requestTitle(details)

		return this.render(title, `Documento ${request.id}`, (doc) => {
			this.titleBlock(doc, title, [`ID ${request.id}`, `Emitido em ${this.formatDateTime(new Date())}`])

			this.doctorSection(doc, 'Médico solicitante', request.doctor)
			this.patientSection(doc, request.patient)
			this.requestBody(doc, details)

			doc.y += 6
			doc
				.font(FONT.regular)
				.fontSize(9)
				.fillColor(COLOR.ink)
				.text(`Data da solicitação: ${this.formatDate(request.createdAt)}`, LAYOUT.marginX, doc.y, {
					width: this.contentWidth(doc),
					align: 'right',
				})

			if (signature) {
				this.signatureBlock(doc, {
					signerName: request.doctor.user.name,
					crm: request.doctor.crm,
					signedAt: signature.signedAt,
					certificateId: signature.certificateId,
					documentHash: signature.documentHash,
					legalNote: LEGAL_NOTE,
				})
			}
		})
	}

	// ========== TRIAGEM ==========

	/**
	 * Gera PDF da triagem em base64
	 */
	async generateTriagemPDF(triagem: any): Promise<string> {
		const withUnit = (value: any, unit?: string | null, instr?: string | null): string | null => {
			if (value === null || value === undefined) return null
			return `${value}${unit ? ` ${unit}` : ''}${instr ? ` (${instr})` : ''}`
		}

		return this.render('Ficha de triagem', `Documento ${triagem.id}`, (doc) => {
			this.titleBlock(doc, 'Ficha de triagem', [`ID ${triagem.id}`, `Emitido em ${this.formatDateTime(new Date())}`])

			this.patientSection(doc, triagem.patient)

			this.section(doc, 'Responsável pela triagem')
			this.fields(doc, [
				{ label: 'Nome', value: triagem.user.name },
				{ label: 'Função', value: this.formatRole(triagem.user.role) },
			])

			this.section(doc, 'Sinais vitais')
			this.fields(
				doc,
				[
					{ label: 'Frequência cardíaca', value: withUnit(triagem.frequenciaCardiaca, triagem.frequenciaCardiacaUnit, triagem.frequenciaCardiacaInstr) },
					{ label: 'Frequência respiratória', value: withUnit(triagem.frequenciaRespiratoria, triagem.frequenciaRespiratoriaUnit, triagem.frequenciaRespiratoriaInstr) },
					{ label: 'SpO2', value: withUnit(triagem.spo2, triagem.spo2Unit, triagem.spo2Instr) },
					{ label: 'Temperatura', value: withUnit(triagem.temperatura, triagem.temperaturaUnit, triagem.temperaturaInstr) },
					{ label: 'Pressão arterial sistólica', value: withUnit(triagem.pressaoArterialSistolica, triagem.pressaoArterialUnit, triagem.pressaoArterialInstr) },
					{ label: 'Pressão arterial diastólica', value: withUnit(triagem.pressaoArterialDiastolica, triagem.pressaoArterialUnit, triagem.pressaoArterialInstr) },
					{ label: 'PAM', value: withUnit(triagem.pam, 'mmHg') },
					{ label: 'Glicemia', value: withUnit(triagem.glicemia, triagem.glicemiaUnit, triagem.glicemiaInstr) },
					{ label: 'Pressão venosa central', value: withUnit(triagem.pressaoVenosaCentral, triagem.pressaoVenosaCentralUnit, triagem.pressaoVenosaCentralInstr) },
					{ label: 'Pressão intracraniana', value: withUnit(triagem.pressaoIntracraniana, triagem.pressaoIntracranianaUnit, triagem.pressaoIntracranianaInstr) },
				]
			)

			this.section(doc, 'Medidas')
			this.fields(
				doc,
				[
					{ label: 'Capnografia', value: withUnit(triagem.capnografia, triagem.capnografiaUnit, triagem.capnografiaInstr) },
					{ label: 'Peso', value: withUnit(triagem.peso, triagem.pesoUnit, triagem.pesoInstr) },
					{ label: 'Altura', value: withUnit(triagem.altura, triagem.alturaUnit, triagem.alturaInstr) },
					{ label: 'Perímetro cefálico', value: withUnit(triagem.perimetroCefalico, triagem.perimetroCefalicoUnit, triagem.perimetroCefalicoInstr) },
				]
			)

			doc.y += 6
			doc
				.font(FONT.regular)
				.fontSize(9)
				.fillColor(COLOR.ink)
				.text(`Data da triagem: ${this.formatDateTime(triagem.createdAt)}`, LAYOUT.marginX, doc.y, {
					width: this.contentWidth(doc),
					align: 'right',
				})
		})
	}

	// ========== RELATÓRIO COMPLETO ==========

	/**
	 * Gera PDF combinado com triagem, solicitações e prescrições de uma consulta
	 */
	async generateAppointmentCompletePDF(appointment: any): Promise<string> {
		return this.render('Relatório da consulta', `Consulta ${appointment.id}`, (doc) => {
			this.titleBlock(doc, 'Relatório completo da consulta', [
				`ID ${appointment.id}`,
				`Emitido em ${this.formatDateTime(new Date())}`,
			])

			this.section(doc, 'Consulta')
			this.fields(doc, [
				{ label: 'Data e hora', value: this.formatDateTime(appointment.appointmentDate) },
				{ label: 'Status', value: this.translateStatus(appointment.status) },
				{ label: 'Motivo', value: appointment.reason },
				{ label: 'Observações', value: appointment.notes },
			])

			this.patientSection(doc, appointment.patient, true)
			this.doctorSection(doc, 'Médico responsável', appointment.doctor)

			const requests: any[] = appointment.requests ?? []
			requests.forEach((request, index) => {
				doc.addPage()
				const details = request.details as any
				this.titleBlock(doc, this.requestTitle(details), [
					requests.length > 1 ? `${index + 1} de ${requests.length}` : '',
					`Solicitada em ${this.formatDateTime(request.createdAt)}`,
				])
				this.requestBody(doc, details)
				this.doctorSignature(doc, appointment.doctor)
			})

			const prescriptions: any[] = appointment.prescriptions ?? []
			prescriptions.forEach((prescription, index) => {
				doc.addPage()
				this.titleBlock(doc, 'Prescrição médica', [
					prescriptions.length > 1 ? `${index + 1} de ${prescriptions.length}` : '',
					`Prescrita em ${this.formatDateTime(prescription.createdAt)}`,
				])
				this.prescriptionBody(doc, prescription)
				this.doctorSignature(doc, appointment.doctor)
			})
		})
	}

	// ========== FORMATADORES ==========

	private formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
	}

	private formatDateTime(date: Date | string): string {
		return new Date(date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
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

	private formatRole(role: string): string {
		const roles: Record<string, string> = {
			admin: 'Administrador',
			doctor: 'Médico',
		}
		return roles[role] || 'Outros'
	}

	private translateStatus(status: string): string {
		const statuses: Record<string, string> = {
			scheduled: 'Agendada',
			inProgress: 'Em andamento',
			completed: 'Concluída',
			cancelled: 'Cancelada',
			noShow: 'Paciente não compareceu',
		}
		return statuses[status] || status
	}
}

export const pdfGeneratorService = new PDFGeneratorService()
