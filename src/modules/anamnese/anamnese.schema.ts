import { z } from "zod";

export const createAnamneseSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  
  // Queixa Principal e HDA
  queixaPrincipal: z.string().optional(),
  anamneseRetorno: z.string().optional(),
  hdaInicio: z.string().optional(),
  hdaDuracao: z.string().optional(),
  hdaIntensidade: z.string().optional(),
  hdaCaracteristica: z.string().optional(),
  hdaLocalizacao: z.string().optional(),
  hdaIrradiacao: z.string().optional(),
  hdaFatoresMelhora: z.string().optional(),
  hdaFatoresPiora: z.string().optional(),
  hdaSintomasAssociados: z.string().optional(),
  hdaEvolucao: z.string().optional(),
  
  // Sinais Vitais
  pressaoArterial: z.string().optional(),
  frequenciaCardiaca: z.string().optional(),
  frequenciaRespiratoria: z.string().optional(),
  temperatura: z.string().optional(),
  saturacaoO2: z.string().optional(),
  peso: z.string().optional(),
  altura: z.string().optional(),
  imc: z.string().optional(),
  
  // Histórico
  historicoMedico: z.string().optional(),
  medicamentosEmUso: z.string().optional(),
  alergias: z.string().optional(),
  historicoFamiliar: z.string().optional(),
  habitosVida: z.string().optional(),
  examesAnteriores: z.string().optional(),
  
  // Exame Físico e Diagnóstico
  revisaoSistemas: z.string().optional(),
  examesFisicos: z.string().optional(),
  hipoteseDiagnostica: z.string().optional(),
  cid10: z.string().optional(),
  diagnosticosDiferenciais: z.string().optional(),
  condutaClinica: z.string().optional(),
});

export const updateAnamneseSchema = createAnamneseSchema.partial();

export const getAnamneseByIdSchema = z.object({
  id: z.string().uuid(),
});

export const getAnamnesesByPatientSchema = z.object({
  patientId: z.string().uuid(),
});

export const getAnamnesesByDoctorSchema = z.object({
  doctorId: z.string().uuid(),
});

export type CreateAnamneseInput = z.infer<typeof createAnamneseSchema>;
export type UpdateAnamneseInput = z.infer<typeof updateAnamneseSchema>;
export type GetAnamneseByIdInput = z.infer<typeof getAnamneseByIdSchema>;
export type GetAnamnesesByPatientInput = z.infer<typeof getAnamnesesByPatientSchema>;
export type GetAnamnesesByDoctorInput = z.infer<typeof getAnamnesesByDoctorSchema>;
