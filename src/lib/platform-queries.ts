// SUPERADMIN-ONLY MODULE. Every function here queries or mutates across all
// tenants with no tenantId filter. Do not import this from tenant-facing
// code paths — only from handlers that have already verified
// session.user.role === 'SUPERADMIN'.
import type { PrismaClient, SettlementRecord, Tenant, TenantStatus, User } from '@prisma/client'
import { hashPassword } from '@/lib/password'

export function listAllTenantsSettlements(db: PrismaClient): Promise<SettlementRecord[]> {
  return db.settlementRecord.findMany({ orderBy: [{ tenantId: 'asc' }, { month: 'asc' }] })
}

export function listTenants(db: PrismaClient): Promise<Tenant[]> {
  return db.tenant.findMany({ orderBy: { createdAt: 'desc' } })
}

export type TenantWithAdmin = Tenant & { adminName: string | null }

// "The admin" for a tenant is its earliest-created TENANT_ADMIN user — the
// one createTenantWithAdmin makes at tenant creation. A tenant can have more
// TENANT_ADMIN accounts since /users lets one create more, but this is the
// one shown/edited from the platform-wide tenant list.
export async function listTenantsWithAdmin(db: PrismaClient): Promise<TenantWithAdmin[]> {
  const tenants = await db.tenant.findMany({ orderBy: { createdAt: 'desc' } })
  const admins = await db.user.findMany({
    where: { tenantId: { in: tenants.map((t) => t.id) }, role: 'TENANT_ADMIN' },
    orderBy: { createdAt: 'asc' },
  })

  const firstAdminNameByTenant = new Map<string, string>()
  for (const admin of admins) {
    if (admin.tenantId && !firstAdminNameByTenant.has(admin.tenantId)) {
      firstAdminNameByTenant.set(admin.tenantId, admin.name)
    }
  }

  return tenants.map((t) => ({ ...t, adminName: firstAdminNameByTenant.get(t.id) ?? null }))
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

export async function updateTenantAndAdmin(
  db: PrismaClient,
  input: { tenantId: string; tenantName: string; adminName: string }
): Promise<{ tenant: Tenant; adminUser: User | null }> {
  return db.$transaction(async (tx) => {
    const tenant = await tx.tenant.update({
      where: { id: input.tenantId },
      data: { name: input.tenantName },
    })

    const firstAdmin = await tx.user.findFirst({
      where: { tenantId: input.tenantId, role: 'TENANT_ADMIN' },
      orderBy: { createdAt: 'asc' },
    })

    const adminUser = firstAdmin
      ? await tx.user.update({ where: { id: firstAdmin.id }, data: { name: input.adminName } })
      : null

    return { tenant, adminUser }
  })
}

export function setTenantStatus(
  db: PrismaClient,
  tenantId: string,
  status: TenantStatus
): Promise<Tenant> {
  return db.tenant.update({ where: { id: tenantId }, data: { status } })
}
