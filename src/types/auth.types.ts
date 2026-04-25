export type UserRole = 'master' | 'admin' | 'doctor' | 'patient'

export type JWTPayload = {
	id: string
	sub?: string
	userId?: string
	role: UserRole
	name: string
	email?: string
	doctorId?: string
	patientId?: string
	iat: number
	exp: number
	aud: string
	iss: string
}
