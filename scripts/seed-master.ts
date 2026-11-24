import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function seedMaster() {
	try {
		console.log('Iniciando seed do master...')

		const masterEmail = process.env.MASTER_EMAIL
		const masterPassword = process.env.MASTER_PASSWORD
		const masterCpf = process.env.MASTER_CPF
		const masterName = process.env.MASTER_NAME || 'Master Amparo Online'

		if (!masterEmail || !masterPassword || !masterCpf) {
			throw new Error('MASTER_EMAIL, MASTER_PASSWORD e MASTER_CPF devem estar configurados no ambiente')
		}

		if (masterPassword.length < 12) {
			throw new Error('MASTER_PASSWORD deve ter pelo menos 12 caracteres')
		}

		const existingUser = await prisma.user.findUnique({
			where: { email: masterEmail },
		})

		if (existingUser) {
			console.log(`Master com email ${masterEmail} já existe. Pulando seed...`)
			return
		}

		const hashedPassword = await bcrypt.hash(masterPassword, 10)

		const user = await prisma.user.create({
			data: {
				name: masterName,
				cpf: masterCpf,
				phone: '00000000000',
				email: masterEmail,
				password: hashedPassword,
				role: 'master',
				master: {
					create: {},
				},
			},
			include: {
				master: true,
			},
		})

		console.log('Master criado com sucesso!')
		console.log('Email:', masterEmail)
		console.log('IMPORTANTE: altere a senha após o primeiro login.')
		console.log('ID:', user.id)
	} catch (error) {
		console.error('Erro ao criar master:', error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

seedMaster()
	.then(() => {
		console.log('Seed concluído!')
		process.exit(0)
	})
	.catch((error) => {
		console.error('Erro fatal:', error)
		process.exit(1)
	})
