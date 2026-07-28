import type { PrismaClient } from '@prisma/client'
import { buildOperationsOverview, type OverviewSettlement } from '@/lib/overview/build-operations-overview'
import { listAllTenantsSettlements } from '@/lib/platform-queries'
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
