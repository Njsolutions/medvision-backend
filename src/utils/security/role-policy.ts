export type UserRole = 'master' | 'admin' | 'doctor' | 'patient'

// Quais papéis cada papel pode cadastrar. Master cadastra todos; admin não cadastra master nem admin.
const CREATABLE_ROLES: Record<UserRole, readonly UserRole[]> = {
	master: ['master', 'admin', 'doctor', 'patient'],
	admin: ['doctor', 'patient'],
	doctor: [],
	patient: [],
}

export function canCreateRole(creatorRole: UserRole | undefined, targetRole: UserRole) {
	if (!creatorRole) return false
	return CREATABLE_ROLES[creatorRole].includes(targetRole)
}
