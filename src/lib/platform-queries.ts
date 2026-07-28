// SUPERADMIN-ONLY MODULE. Every function here queries across all tenants
// with no tenantId filter. Do not import this from tenant-facing code paths —
// only from handlers that have already verified session.user.role === 'SUPERADMIN'.
import type { PrismaClient, SettlementRecord } from '@prisma/client'

export function listAllTenantsSettlements(db: PrismaClient): Promise<SettlementRecord[]> {
  return db.settlementRecord.findMany({ orderBy: [{ tenantId: 'asc' }, { month: 'asc' }] })
}
