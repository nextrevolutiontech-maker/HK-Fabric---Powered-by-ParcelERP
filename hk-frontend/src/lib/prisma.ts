import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * PERF FIX: Optimized Prisma client for Vercel Serverless + Neon PostgreSQL
 *
 * Key settings:
 * - log: ['error'] only in production — 'query' logging was adding significant overhead per request
 * - connection_limit=1 in DATABASE_URL (set in .env / Vercel env) for serverless compatibility
 * - globalThis caching prevents new PrismaClient on every hot-reload in development
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        // Append connection_limit=1 for Vercel serverless + Neon pooler compatibility
        // The -pooler endpoint in DATABASE_URL + connection_limit=1 = optimal serverless perf
        url: process.env.DATABASE_URL,
      }
    }
  })

// In development, reuse the prisma instance across hot-reloads to avoid connection exhaustion
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
