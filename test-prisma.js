import { db } from './src/lib/prisma.js'

console.log('Testing Prisma connection...')
console.log('db:', typeof db)
console.log('db.prescription:', typeof db.prescription)

try {
	const count = await db.prescription.count()
	console.log('Prescription count:', count)
	
	const patients = await db.patient.findMany({ take: 1 })
	console.log('Found patients:', patients.length)
	
	process.exit(0)
} catch (error) {
	console.error('Error:', error)
	process.exit(1)
}
