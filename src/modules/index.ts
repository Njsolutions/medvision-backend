import type { FastifyInstance } from 'fastify'
import { adminRoutes } from './admin/admin.routes'
import { anamneseRoutes } from './anamnese/anamnese.routes'
import { appointmentRoutes } from './appointment/appointment.routes'
import { auditLogRoutes } from './auditlog/auditlog.routes'
import { authRoutes } from './auth/auth.routes'
import { doctorRoutes } from './doctor/doctor.routes'
import { patientRoutes } from './patient/patient.routes'
import { patientFileRoutes } from './patientfile/patientfile.routes'
import { prescriptionRoutes } from './prescription/prescription.routes'
import { requestRoutes } from './request/request.routes'
import { triagemRoutes } from './triagem/triagem.routes'
import { utiRoutes } from './uti/uti.routes'

export function registerModules(app: FastifyInstance, version: string) {
	app.register(authRoutes, { prefix: `/v${version}/auth` })
	app.register(adminRoutes, { prefix: `/v${version}/admins` })
	app.register(doctorRoutes, { prefix: `/v${version}/doctors` })
	app.register(patientRoutes, { prefix: `/v${version}/patients` })
	app.register(utiRoutes, { prefix: `/v${version}/utis` })
	app.register(appointmentRoutes, { prefix: `/v${version}/appointments` })
	app.register(auditLogRoutes, { prefix: `/v${version}/audit-logs` })
	app.register(triagemRoutes, { prefix: `/v${version}/triagens` })
	app.register(patientFileRoutes, { prefix: `/v${version}/patient-files` })
	app.register(requestRoutes, { prefix: `/v${version}/requests` })
	app.register(prescriptionRoutes, { prefix: `/v${version}/prescriptions` })
	app.register(anamneseRoutes, { prefix: `/v${version}/anamneses` })
}
