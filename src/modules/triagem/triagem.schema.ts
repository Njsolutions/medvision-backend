import { z } from 'zod'

export const CreateTriagemSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID'),
	appointmentId: z.string().uuid('Invalid appointment ID').optional(),

	queixaPrincipal: z.string().optional(),
	duracaoQueixa: z.string().optional(),
	examesAnteriores: z.string().optional(),

	// Sinais Vitais
	frequenciaCardiaca: z.number().optional(),
	frequenciaCardiacaUnit: z.string().optional(),
	frequenciaCardiacaInstr: z.string().optional(),

	frequenciaRespiratoria: z.number().optional(),
	frequenciaRespiratoriaUnit: z.string().optional(),
	frequenciaRespiratoriaInstr: z.string().optional(),

	spo2: z.number().optional(),
	spo2Unit: z.string().optional(),
	spo2Instr: z.string().optional(),

	temperatura: z.number().optional(),
	temperaturaUnit: z.string().optional(),
	temperaturaInstr: z.string().optional(),

	pressaoArterialSistolica: z.number(),
	pressaoArterialDiastolica: z.number(),
	pressaoArterialUnit: z.string().optional(),
	pressaoArterialInstr: z.string().optional(),

	pam: z.number().optional(),

	glicemia: z.number().optional(),
	glicemiaUnit: z.string().optional(),
	glicemiaInstr: z.string().optional(),

	pressaoVenosaCentral: z.number().optional(),
	pressaoVenosaCentralUnit: z.string().optional(),
	pressaoVenosaCentralInstr: z.string().optional(),

	pressaoIntracraniana: z.number().optional(),
	pressaoIntracranianaUnit: z.string().optional(),
	pressaoIntracranianaInstr: z.string().optional(),

	// Medidas
	capnografia: z.number().optional(),
	capnografiaUnit: z.string().optional(),
	capnografiaInstr: z.string().optional(),

	peso: z.number(),
	pesoUnit: z.string().optional(),
	pesoInstr: z.string().optional(),

	altura: z.number(),
	alturaUnit: z.string().optional(),
	alturaInstr: z.string().optional(),

	perimetroCefalico: z.number().optional(),
	perimetroCefalicoUnit: z.string().optional(),
	perimetroCefalicoInstr: z.string().optional(),
})

export const UpdateTriagemSchema = z.object({
	appointmentId: z.string().uuid('Invalid appointment ID').nullable().optional(),

	queixaPrincipal: z.string().nullable().optional(),
	duracaoQueixa: z.string().nullable().optional(),
	examesAnteriores: z.string().nullable().optional(),

	// Sinais Vitais
	frequenciaCardiaca: z.number().nullable().optional(),
	frequenciaCardiacaUnit: z.string().nullable().optional(),
	frequenciaCardiacaInstr: z.string().nullable().optional(),

	frequenciaRespiratoria: z.number().nullable().optional(),
	frequenciaRespiratoriaUnit: z.string().nullable().optional(),
	frequenciaRespiratoriaInstr: z.string().nullable().optional(),

	spo2: z.number().nullable().optional(),
	spo2Unit: z.string().nullable().optional(),
	spo2Instr: z.string().nullable().optional(),

	temperatura: z.number().nullable().optional(),
	temperaturaUnit: z.string().nullable().optional(),
	temperaturaInstr: z.string().nullable().optional(),

	pressaoArterialSistolica: z.number().nullable().optional(),
	pressaoArterialDiastolica: z.number().nullable().optional(),
	pressaoArterialUnit: z.string().nullable().optional(),
	pressaoArterialInstr: z.string().nullable().optional(),

	pam: z.number().nullable().optional(),

	glicemia: z.number().nullable().optional(),
	glicemiaUnit: z.string().nullable().optional(),
	glicemiaInstr: z.string().nullable().optional(),

	pressaoVenosaCentral: z.number().nullable().optional(),
	pressaoVenosaCentralUnit: z.string().nullable().optional(),
	pressaoVenosaCentralInstr: z.string().nullable().optional(),

	pressaoIntracraniana: z.number().nullable().optional(),
	pressaoIntracranianaUnit: z.string().nullable().optional(),
	pressaoIntracranianaInstr: z.string().nullable().optional(),

	// Medidas
	capnografia: z.number().nullable().optional(),
	capnografiaUnit: z.string().nullable().optional(),
	capnografiaInstr: z.string().nullable().optional(),

	peso: z.number().nullable().optional(),
	pesoUnit: z.string().nullable().optional(),
	pesoInstr: z.string().nullable().optional(),

	altura: z.number().nullable().optional(),
	alturaUnit: z.string().nullable().optional(),
	alturaInstr: z.string().nullable().optional(),

	perimetroCefalico: z.number().nullable().optional(),
	perimetroCefalicoUnit: z.string().nullable().optional(),
	perimetroCefalicoInstr: z.string().nullable().optional(),
})

export const TriagemIdSchema = z.object({
	id: z.string().uuid('Invalid triagem ID'),
})

export const PatientIdSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID'),
})

export type CreateTriagemInput = z.infer<typeof CreateTriagemSchema>
export type UpdateTriagemInput = z.infer<typeof UpdateTriagemSchema>
export type TriagemIdInput = z.infer<typeof TriagemIdSchema>
export type PatientIdInput = z.infer<typeof PatientIdSchema>
