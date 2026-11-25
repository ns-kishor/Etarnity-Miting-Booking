import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

function findSourceDb(): string | null {
  const candidates = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), '.next', 'server', 'db', 'custom.db'),
    path.resolve(process.cwd(), 'db', 'custom.db'),
    path.resolve('db/custom.db'),
    path.join(__dirname, '..', '..', '..', 'db', 'custom.db'),
    path.join(__dirname, '..', '..', 'db', 'custom.db'),
    path.join(__dirname, '..', 'db', 'custom.db'),
    path.join(__dirname, 'db', 'custom.db'),
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ c) && fs.statSync(/*turbopackIgnore: true*/ c).size > 1000) {
        return c
      }
    } catch {}
  }
  return null
}

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL
  if (envUrl && !envUrl.startsWith('file:')) {
    return envUrl
  }

  // When deployed on Vercel or AWS Lambda, the filesystem is read-only.
  // SQLite needs write access to create WAL journal files.
  // Copy the bundled database file to /tmp on cold start.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = '/tmp/custom.db'
    let needsCopy = true
    try {
      if (fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 1000) {
        needsCopy = false
      }
    } catch {
      needsCopy = true
    }

    if (needsCopy) {
      const sourceDb = findSourceDb()
      if (sourceDb) {
        try {
          fs.copyFileSync(sourceDb, tmpDbPath)
          console.log(`[db] Copied SQLite database from ${sourceDb} to ${tmpDbPath}`)
        } catch (e) {
          console.error('[db] Failed to copy database to /tmp:', e)
        }
      } else {
        console.warn('[db] Could not locate source SQLite database to copy to /tmp')
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
