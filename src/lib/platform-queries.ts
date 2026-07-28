// SUPERADMIN-ONLY MODULE. Every function here queries or mutates across all
// tenants with no tenantId filter. Do not import this from tenant-facing
// code paths — only from handlers that have already verified
// session.user.role === 'SUPERADMIN'.
import type { PrismaClient, SettlementRecord, Tenant, User } from '@prisma/client'
import { hashPassword } from '@/lib/password'

export function listAllTenantsSettlements(db: PrismaClient): Promise<SettlementRecord[]> {
  return db.settlementRecord.findMany({ orderBy: [{ tenantId: 'asc' }, { month: 'asc' }] })
}

export function listTenants(db: PrismaClient): Promise<Tenant[]> {
  return db.tenant.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createTenantWithAdmin(
  db: PrismaClient,
  input: { tenantName: string; adminName: string; adminEmail: string; adminPassword: string }
): Promise<{ tenant: Tenant; adminUser: User }> {
  const passwordHash = await hashPassword(input.adminPassword)

  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: input.tenantName } })
    const adminUser = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: input.adminName,
        email: input.adminEmail,
        passwordHash,
        role: 'TENANT_ADMIN',
      },
    })
    return { tenant, adminUser }
  })
}
