import type { PrismaClient, TenantStatus } from '@prisma/client'
import {
  listTenantsWithAdmin,
  createTenantWithAdmin,
  updateTenantAndAdmin,
  setTenantStatus,
} from '@/lib/platform-queries'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listTenantsHandler(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['SUPERADMIN'])
  return listTenantsWithAdmin(db)
}

export async function createTenantHandler(
  db: PrismaClient,
  session: SessionUser,
  input: { tenantName: string; adminName: string; adminEmail: string; adminPassword: string }
) {
  requireRole(session, ['SUPERADMIN'])
  return createTenantWithAdmin(db, input)
}

export async function updateTenantHandler(
  db: PrismaClient,
  session: SessionUser,
  input: { tenantId: string; tenantName: string; adminName: string }
) {
  requireRole(session, ['SUPERADMIN'])
  return updateTenantAndAdmin(db, input)
}

export async function setTenantStatusHandler(
  db: PrismaClient,
  session: SessionUser,
  input: { tenantId: string; status: TenantStatus }
) {
  requireRole(session, ['SUPERADMIN'])
  return setTenantStatus(db, input.tenantId, input.status)
}
