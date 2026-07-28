import type { PrismaClient, CalendarViewMode } from '@prisma/client'
import { TenantRepository } from '@/lib/repositories/tenant-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function getTenantProfile(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN'])
  return new TenantRepository(db, session.tenantId!).get()
}

export async function updateTenantProfile(
  db: PrismaClient,
  session: SessionUser,
  input: {
    name: string
    contactName: string | null
    contactPhone: string | null
    defaultCalendarView: CalendarViewMode
  }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new TenantRepository(db, session.tenantId!).update(input)
}
