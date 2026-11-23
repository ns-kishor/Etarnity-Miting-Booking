import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL
  if (envUrl && !envUrl.startsWith('file:')) {
    return envUrl
  }

  // When deployed on Vercel or AWS Lambda, the filesystem is read-only.
  // SQLite needs write access to create WAL journal files.
  // Copy the bundled database file to /tmp on cold start.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = '/tmp/custom.db'
    if (!fs.existsSync(tmpDbPath)) {
      const sourceDb = path.join(process.cwd(), 'db', 'custom.db')
      if (fs.existsSync(sourceDb)) {
        try {
          fs.copyFileSync(sourceDb, tmpDbPath)
        } catch (e) {
          console.error('Failed to copy database to /tmp:', e)
        }
      }
    }
    const resolved = `file:${tmpDbPath}`
    process.env.DATABASE_URL = resolved
    return resolved
  }

  if (envUrl) {
    return envUrl
  }
  const localDb = `file:${path.resolve(process.cwd(), 'db/custom.db')}`
  process.env.DATABASE_URL = localDb
  return localDb
}

const dbUrl = getDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db