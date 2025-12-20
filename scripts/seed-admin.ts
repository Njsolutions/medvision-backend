import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function seedAdmin() {
	try {
		console.log('🌱 Iniciando seed do admin...')

		// Buscar variáveis de ambiente para o admin
		const adminEmail = process.env.ADMIN_EMAIL || 'natanaelsouza.dev@gmail.com'
		const adminPassword = process.env.ADMIN_PASSWORD || '@senhaforte123'
		const adminName = process.env.ADMIN_NAME || 'Natanael Souza'

		// Verificar se o usuário admin já existe
		const existingUser = await prisma.user.findUnique({
			where: { email: adminEmail },
		})

		if (existingUser) {
			console.log(`⚠️  Admin com email ${adminEmail} já existe. Pulando seed...`)
			return
		}

		// Hash da senha
		const hashedPassword = await bcrypt.hash(adminPassword, 10)

		// Criar usuário admin
		const user = await prisma.user.create({
			data: {
				name: adminName,
				cpf: '00000000000',
				phone: '00000000000',
				email: adminEmail,
				password: hashedPassword,
				role: 'admin',
				admin: {
					create: {
						utiAccess: true,
					},
				},
			},
			include: {
				admin: true,
			},
		})

		console.log('✅ Admin criado com sucesso!')
		console.log('📧 Email:', adminEmail)
		console.log('🔑 Senha:', adminPassword)
		console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!')
		console.log('👤 ID:', user.id)
	} catch (error) {
		console.error('❌ Erro ao criar admin:', error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

seedAdmin()
	.then(() => {
		console.log('🎉 Seed concluído!')
		process.exit(0)
	})
	.catch((error) => {
		console.error('💥 Erro fatal:', error)
		process.exit(1)
	})
