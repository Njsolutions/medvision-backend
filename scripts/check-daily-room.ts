import 'dotenv/config'

const apiKey = process.env.DAILY_CO_API_KEY
const roomName = 'uti-bed-c56d744d-aaa9-433d-9a7b-91f82e107644'

async function checkRoom() {
	if (!apiKey) {
		console.error('❌ DAILY_CO_API_KEY não configurada')
		return
	}

	try {
		console.log(`Verificando sala: ${roomName}`)
		
		const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error(`❌ Erro ao buscar sala (${response.status}):`, errorText)
			
			if (response.status === 404) {
				console.log('\n⚠️  A sala não existe no Daily.co!')
				console.log('Isso pode ter acontecido se a sala foi deletada ou nunca foi criada.')
			}
			return
		}

		const room = await response.json()
		console.log('\n✅ Sala encontrada:')
		console.log(JSON.stringify(room, null, 2))
	} catch (error) {
		console.error('❌ Erro ao verificar sala:', error)
	}
}

checkRoom()
