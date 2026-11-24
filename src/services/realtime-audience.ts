import { db } from '@/lib/prisma'

/**
 * Médicos com vínculo com o paciente (mesma regra de `canAccessPatient`).
 * Usado em eventos que não carregam `doctorId`, como arquivos e triagens.
 */
export async function doctorIdsForPatient(patientId: string): Promise<string[]> {
	const doctors = await db.doctor.findMany({
		where: {
			OR: [
				{ appointments: { some: { patientId } } },
				{ prescriptions: { some: { patientId } } },
				{ requests: { some: { patientId } } },
				{ anamises: { some: { patientId } } },
			],
		},
		select: { id: true },
	})

	return doctors.map((doctor) => doctor.id)
}
