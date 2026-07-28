import type { PrismaClient } from '@prisma/client'
import { buildOperationsOverview, type OverviewSettlement } from '@/lib/overview/build-operations-overview'
import { listAllTenantsSettlements } from '@/lib/platform-queries'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function getOperationsOverview(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN', 'ACCOUNTANT', 'SUPERADMIN'])

  const settlements =
    session.role === 'SUPERADMIN'
      ? await listAllTenantsSettlements(db)
      : await db.settlementRecord.findMany({ where: { tenantId: session.tenantId! } })

  const overviewSettlements: OverviewSettlement[] = settlements.map((s) => ({
    month: s.month,
    totalRevenue: Number(s.totalRevenue),
    totalCost: Number(s.totalCost),
  }))

  return buildOperationsOverview(overviewSettlements)
}

export async function getRecentTrips(db: PrismaClient, session: SessionUser, limit: number) {
  requireRole(session, ['TENANT_ADMIN', 'ACCOUNTANT'])
  return new TripRepository(db, session.tenantId!).listRecentWithDetails(limit)
}
