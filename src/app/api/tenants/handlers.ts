import type { PrismaClient } from '@prisma/client'
import { listTenants, createTenantWithAdmin } from '@/lib/platform-queries'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listTenantsHandler(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['SUPERADMIN'])
  return listTenants(db)
}

export async function createTenantHandler(
  db: PrismaClient,
  session: SessionUser,
  input: { tenantName: string; adminName: string; adminEmail: string; adminPassword: string }
) {
  requireRole(session, ['SUPERADMIN'])
  return createTenantWithAdmin(db, input)
}
