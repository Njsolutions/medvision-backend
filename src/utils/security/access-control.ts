import { db } from '@/lib/prisma'
import type { AuthUser } from '@/types/fastify'

export function isAdminLike(user?: AuthUser) {
	return user?.role === 'master' || user?.role === 'admin'
}

export function isDoctor(user?: AuthUser) {
	return user?.role === 'doctor'
}

export function isPatient(user?: AuthUser) {
	return user?.role === 'patient'
}

export async function canAccessPatient(user: AuthUser | undefined, patientId: string) {
	if (!user) return false
	if (isAdminLike(user)) return true
	if (isPatient(user)) return user.patientId === patientId

	if (isDoctor(user) && user.doctorId) {
		const relation = await db.patient.findFirst({
			where: {
				id: patientId,
				OR: [
					{ appointments: { some: { doctorId: user.doctorId } } },
					{ prescriptions: { some: { doctorId: user.doctorId } } },
					{ requests: { some: { doctorId: user.doctorId } } },
					{ anamises: { some: { doctorId: user.doctorId } } },
				],
			},
			select: { id: true },
		})

		return Boolean(relation)
	}

	return false
}

export function canAccessDoctor(user: AuthUser | undefined, doctorId: string) {
	if (!user) return false
	if (isAdminLike(user)) return true
	return isDoctor(user) && user.doctorId === doctorId
}

export async function canAccessAppointment(
	user: AuthUser | undefined,
	appointment: { patientId: string; doctorId: string },
) {
	if (!user) return false
	if (isAdminLike(user)) return true
	if (isDoctor(user)) return user.doctorId === appointment.doctorId
	if (isPatient(user)) return user.patientId === appointment.patientId
	return false
}

export async function canAccessUti(user: AuthUser | undefined) {
	if (!user) return false
	if (isAdminLike(user)) return true
	if (!isDoctor(user) || !user.doctorId) return false

	const doctor = await db.doctor.findUnique({
		where: { id: user.doctorId },
		select: { utiAccess: true },
	})

	return Boolean(doctor?.utiAccess)
}

export async function canManageUtiBed(user: AuthUser | undefined) {
	if (!user) return false
	if (user.role === 'master') return true
	if (user.role !== 'admin') return false

	const admin = await db.admin.findUnique({
		where: { userId: user.id },
		select: { utiAccess: true },
	})

	return Boolean(admin?.utiAccess)
}
