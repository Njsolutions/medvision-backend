import { z } from 'zod'

export const CreateTriagemSchema = z.object({
	patientId: z.string().uuid('Invalid patient ID'),
	appointmentId: z.string().uuid('Invalid appointment ID').optional(),

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

	pressaoArterialSistolica: z.number().optional(),
	pressaoArterialDiastolica: z.number().optional(),
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

	peso: z.number().optional(),
	pesoUnit: z.string().optional(),
	pesoInstr: z.string().optional(),

	altura: z.number().optional(),
	alturaUnit: z.string().optional(),
	alturaInstr: z.string().optional(),

	perimetroCefalico: z.number().optional(),
	perimetroCefalicoUnit: z.string().optional(),
	perimetroCefalicoInstr: z.string().optional(),
})

export const UpdateTriagemSchema = z.object({
	appointmentId: z.string().uuid('Invalid appointment ID').optional(),

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

	pressaoArterialSistolica: z.number().optional(),
	pressaoArterialDiastolica: z.number().optional(),
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

	peso: z.number().optional(),
	pesoUnit: z.string().optional(),
	pesoInstr: z.string().optional(),

	altura: z.number().optional(),
	alturaUnit: z.string().optional(),
	alturaInstr: z.string().optional(),

	perimetroCefalico: z.number().optional(),
	perimetroCefalicoUnit: z.string().optional(),
	perimetroCefalicoInstr: z.string().optional(),
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
