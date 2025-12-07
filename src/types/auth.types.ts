export type UserRole = 'master' | 'admin' | 'doctor' | 'patient'

export type JWTPayload = {
	id: string
	role: UserRole
	name: string
	iat: number
	exp: number
	aud: string
	iss: string
}
