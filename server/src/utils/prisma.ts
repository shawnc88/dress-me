import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Append connection-pool + timeout params to DATABASE_URL so a burst of users
 * can't exhaust the database's connections and leave requests hanging forever
 * (the failure mode behind the "loads indefinitely" spinner under load):
 *  - connection_limit: cap connections THIS instance opens, so the DB's max is
 *    never blown (keep instances * limit < DB max_connections).
 *  - pool_timeout: how long a query waits for a free pooled connection before it
 *    ERRORS instead of hanging.
 *  - connect_timeout: cap the initial connect so a cold/unreachable DB fails fast.
 * Existing params in the URL are respected (e.g. a real pooler / pgbouncer).
 */
function poolTunedUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  const add: string[] = [];
  if (!/[?&]connection_limit=/.test(base)) add.push('connection_limit=10');
  if (!/[?&]pool_timeout=/.test(base)) add.push('pool_timeout=10');
  if (!/[?&]connect_timeout=/.test(base)) add.push('connect_timeout=10');
  if (add.length === 0) return base;
  return base + (base.includes('?') ? '&' : '?') + add.join('&');
}

const tunedUrl = poolTunedUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(tunedUrl ? { datasources: { db: { url: tunedUrl } } } : undefined);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
