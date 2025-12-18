import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'

const db = new PrismaClient()

export { db }
