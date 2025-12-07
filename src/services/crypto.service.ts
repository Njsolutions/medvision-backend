import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

export class CryptoService {
	async generatePassword(size: number): Promise<string> {
		try {
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?'
			let password = ''
			for (let i = 0; i < size; i++) {
				const randomIndex = Math.floor(Math.random() * chars.length)
				password += chars[randomIndex]
			}
			return password
		} catch {
			throw new Error('Erro ao gerar senha')
		}
	}

	async hashPassword(password: string): Promise<string> {
		try {
			return await bcrypt.hash(password, SALT_ROUNDS)
		} catch {
			throw new Error('Erro ao fazer hash da senha')
		}
	}

	async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
		try {
			return await bcrypt.compare(plainPassword, hashedPassword)
		} catch {
			return false
		}
	}

	generateRandomCode(length: number = 6): string {
		let code = ''
		for (let i = 0; i < length; i++) {
			code += Math.floor(Math.random() * 10)
		}
		return code
	}

	generateSecurityCode(): string {
		return this.generateRandomCode(6)
	}

	generateResetToken(): string {
		return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
	}

	hashToken(token: string): string {
		return Buffer.from(token).toString('base64')
	}

	isValidCPFFormat(cpf: string): boolean {
		// Remove formatação
		const cleanCPF = cpf.replace(/\D/g, '')
		// Deve ter 11 dígitos
		return cleanCPF.length === 11
	}

	sanitizeInput(input: string): string {
		return input
			.trim()
			.replace(/[<>]/g, '') // Remove < e >
			.substring(0, 255) // Limita comprimento
	}
}
