import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const doctors = [
	{
		user: {
			name: 'Dr. Carlos Eduardo Silva',
			cpf: '11122233344',
			phone: '11998877665',
			email: 'carlos.silva@medvision.com',
			role: 'doctor' as const,
		},
		crm: '123456/SP',
		specialty: 'Cardiologia',
		monthlySlots: 40,
		utiAccess: true,
	},
	{
		user: {
			name: 'Dra. Ana Beatriz Souza',
			cpf: '55566677788',
			phone: '11997766554',
			email: 'ana.souza@medvision.com',
			role: 'doctor' as const,
		},
		crm: '789012/SP',
		specialty: 'Clínica Geral',
		monthlySlots: 60,
		utiAccess: false,
	},
]

const patients = [
	{
		user: {
			name: 'João Pedro Ferreira',
			cpf: '11111111111',
			phone: '11988776655',
			email: 'joao.ferreira@email.com',
			role: 'patient' as const,
		},
		age: 45,
		birthDate: new Date('1981-03-10T00:00:00.000Z'),
		gender: 'male' as const,
		motherName: 'Maria Clara Ferreira',
		address: { rua: 'Rua das Flores', numero: '120', bairro: 'Jardim Paulista', cidade: 'São Paulo', uf: 'SP', cep: '01310-100' },
	},
	{
		user: {
			name: 'Mariana Alves Costa',
			cpf: '22222222222',
			phone: '11977665544',
			email: 'mariana.costa@email.com',
			role: 'patient' as const,
		},
		age: 32,
		birthDate: new Date('1994-07-22T00:00:00.000Z'),
		gender: 'female' as const,
		motherName: 'Lucia Helena Alves',
		address: { rua: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', cep: '01310-100' },
	},
	{
		user: {
			name: 'Roberto Nascimento',
			cpf: '33333333333',
			phone: '11966554433',
			email: 'roberto.nascimento@email.com',
			role: 'patient' as const,
		},
		age: 67,
		birthDate: new Date('1959-01-30T00:00:00.000Z'),
		gender: 'male' as const,
		motherName: 'Teresa Cristina Nascimento',
		address: { rua: 'Rua Augusta', numero: '500', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP', cep: '01305-000' },
	},
	{
		user: {
			name: 'Fernanda Lima Santos',
			cpf: '44444444444',
			phone: '11955443322',
			email: 'fernanda.santos@email.com',
			role: 'patient' as const,
		},
		age: 28,
		birthDate: new Date('1998-09-05T00:00:00.000Z'),
		gender: 'female' as const,
		motherName: 'Renata Aparecida Lima',
		address: { rua: 'Rua Oscar Freire', numero: '300', bairro: 'Jardins', cidade: 'São Paulo', uf: 'SP', cep: '01426-001' },
	},
	{
		user: {
			name: 'Lucas Oliveira Mendes',
			cpf: '55555555555',
			phone: '11944332211',
			email: 'lucas.mendes@email.com',
			role: 'patient' as const,
		},
		age: 55,
		birthDate: new Date('1971-11-12T00:00:00.000Z'),
		gender: 'male' as const,
		motherName: 'Sônia Maria Oliveira',
		address: { rua: 'Rua da Consolação', numero: '800', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP', cep: '01302-100' },
	},
	{
		user: {
			name: 'Patrícia Ramos Duarte',
			cpf: '66666666666',
			phone: '11933221100',
			email: 'patricia.duarte@email.com',
			role: 'patient' as const,
		},
		age: 41,
		birthDate: new Date('1985-04-18T00:00:00.000Z'),
		gender: 'female' as const,
		motherName: 'Claudia Regina Ramos',
		address: { rua: 'Rua Bela Cintra', numero: '450', bairro: 'Jardim Paulista', cidade: 'São Paulo', uf: 'SP', cep: '01415-000' },
	},
]

async function seedUsers() {
	try {
		if (process.env.NODE_ENV === 'production') {
			throw new Error('seed-users cria usuários de teste com senha fixa e não pode rodar com NODE_ENV=production')
		}

		console.log('Iniciando seed de médicos e pacientes...')

		const password = 'MedVision@2026'
		const hashedPassword = await bcrypt.hash(password, 10)

		let doctorsCreated = 0
		for (const doc of doctors) {
			const exists = await prisma.user.findFirst({
				where: { OR: [{ email: doc.user.email }, { cpf: doc.user.cpf }] },
			})
			if (exists) {
				console.log(`Médico ${doc.user.email} (CPF ${doc.user.cpf}) já existe como ${exists.email}. Pulando...`)
				continue
			}

			await prisma.user.create({
				data: {
					...doc.user,
					password: hashedPassword,
					doctor: {
						create: {
							crm: doc.crm,
							specialty: doc.specialty,
							monthlySlots: doc.monthlySlots,
							utiAccess: doc.utiAccess,
						},
					},
				},
			})
			console.log(`Médico criado: ${doc.user.name} (${doc.crm})`)
			doctorsCreated++
		}

		let patientsCreated = 0
		for (const pat of patients) {
			const exists = await prisma.user.findFirst({
				where: { OR: [{ email: pat.user.email }, { cpf: pat.user.cpf }] },
			})
			if (exists) {
				await prisma.patient.updateMany({
					where: { userId: exists.id, birthDate: null },
					data: { birthDate: pat.birthDate },
				})
				console.log(`Paciente ${pat.user.email} (CPF ${pat.user.cpf}) já existe como ${exists.email}. Pulando...`)
				continue
			}

			await prisma.user.create({
				data: {
					...pat.user,
					password: hashedPassword,
					patient: {
						create: {
							age: pat.age,
							birthDate: pat.birthDate,
							gender: pat.gender,
							motherName: pat.motherName,
							address: pat.address,
						},
					},
				},
			})
			console.log(`Paciente criado: ${pat.user.name}`)
			patientsCreated++
		}

		console.log(`\nSeed concluído!`)
		console.log(`Médicos criados: ${doctorsCreated}`)
		console.log(`Pacientes criados: ${patientsCreated}`)
		console.log(`\nSenha padrão para todos: ${password}`)
		console.log('IMPORTANTE: altere as senhas após o primeiro login.')
	} catch (error) {
		console.error('Erro ao criar seed:', error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

seedUsers()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error('Erro fatal:', error)
		process.exit(1)
	})
