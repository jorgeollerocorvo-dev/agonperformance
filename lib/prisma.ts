import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Neon's pooled URL runs pgbouncer under the hood, which doesn't support
 * cached prepared statements — leaving them enabled produces intermittent
 * "prepared statement s0 already exists" errors under concurrent load.
 * Setting pgbouncer=true tells Prisma to skip that cache. We append it if
 * the DATABASE_URL points at the -pooler host and doesn't already have it.
 */
function normalizeDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  if (!url.includes("-pooler.")) return url;
  if (/[?&]pgbouncer=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    datasourceUrl: normalizeDatabaseUrl(),
  });
}

export const prisma = globalForPrisma.prisma;
