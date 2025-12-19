import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apiKey = process.env.DAILY_CO_API_KEY

async function recreateUtiRooms() {
	if (!apiKey) {
		console.error('❌ DAILY_CO_API_KEY não configurada')
		return
	}

	try {
		console.log('Buscando leitos de UTI com salas...')
		
		const utis = await prisma.uti.findMany({
			where: {
				roomLink: { not: null },
				roomName: { not: null }
			}
		})

		console.log(`Encontrados ${utis.length} leitos com salas\n`)

		for (const uti of utis) {
			console.log(`\n📍 Processando leito ${uti.id}`)
			console.log(`   Nome da sala: ${uti.roomName}`)
			
			try {
				// 1. Deletar sala antiga
				console.log('   🗑️  Deletando sala antiga...')
				const deleteResponse = await fetch(`https://api.daily.co/v1/rooms/${uti.roomName}`, {
					method: 'DELETE',
					headers: {
						'Authorization': `Bearer ${apiKey}`,
					},
				})

				if (!deleteResponse.ok && deleteResponse.status !== 404) {
					const errorText = await deleteResponse.text()
					console.error(`   ❌ Erro ao deletar sala: ${errorText}`)
					continue
				}

				console.log('   ✓ Sala deletada')

				// Aguardar um pouco para garantir que a sala foi deletada
				await new Promise(resolve => setTimeout(resolve, 1000))

				// 2. Criar nova sala com configurações corretas
				console.log('   🔨 Criando nova sala...')
				const createResponse = await fetch('https://api.daily.co/v1/rooms', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${apiKey}`,
					},
					body: JSON.stringify({
						name: uti.roomName,
						privacy: 'private',
						properties: {
							enable_chat: true,
							enable_screenshare: true,
							enable_recording: 'cloud',
							enable_knocking: false,
							enable_network_ui: false,
							enable_prejoin_ui: false, // IMPORTANTE: Desabilitado
							eject_at_room_exp: false,
							start_video_off: false,
							start_audio_off: false,
						},
					}),
				})

				if (!createResponse.ok) {
					const errorText = await createResponse.text()
					console.error(`   ❌ Erro ao criar sala: ${errorText}`)
					continue
				}

				const room = await createResponse.json()
				console.log('   ✓ Nova sala criada com sucesso')
				console.log(`   URL: ${room.url}`)

				// 3. Atualizar o banco se a URL mudou
				if (room.url !== uti.roomLink) {
					await prisma.uti.update({
						where: { id: uti.id },
						data: { roomLink: room.url }
					})
					console.log('   ✓ URL atualizada no banco')
				}

			} catch (error) {
				console.error(`   ❌ Erro ao processar leito:`, error)
			}
		}

		console.log('\n\n✅ Processo concluído!')
	} catch (error) {
		console.error('❌ Erro geral:', error)
	} finally {
		await prisma.$disconnect()
	}
}

recreateUtiRooms()
