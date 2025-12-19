import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateUtiRoomNames() {
	try {
		console.log('Buscando leitos de UTI sem roomName...')
		
		const utis = await prisma.uti.findMany({
			where: {
				roomLink: {
					not: null
				},
				roomName: null
			}
		})

		console.log(`Encontrados ${utis.length} leitos para atualizar`)

		for (const uti of utis) {
			const roomName = `uti-bed-${uti.id}`
			
			await prisma.uti.update({
				where: { id: uti.id },
				data: { roomName }
			})

			console.log(`✓ Leito ${uti.id} atualizado com roomName: ${roomName}`)
		}

		console.log('\n✅ Migração concluída com sucesso!')
	} catch (error) {
		console.error('❌ Erro ao atualizar roomNames:', error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

updateUtiRoomNames()
