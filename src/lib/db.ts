import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma || (() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({ adapter })
  return client
})()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
