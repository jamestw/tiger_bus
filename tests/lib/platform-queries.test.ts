import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../support/test-db'
import { listAllTenantsSettlements, listTenants, createTenantWithAdmin } from '@/lib/platform-queries'

describe('platform-queries', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('returns settlements across every tenant, unscoped', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverA = await testDb.driver.create({ data: { tenantId: tenantA.id, name: 'A-driver' } })
    const driverB = await testDb.driver.create({ data: { tenantId: tenantB.id, name: 'B-driver' } })
    await testDb.settlementRecord.create({
      data: {
        tenantId: tenantA.id, driverId: driverA.id, month: '2026-07',
        totalRevenue: 1000, totalCost: 200, payableAmount: 800, status: 'GENERATED',
      },
    })
    await testDb.settlementRecord.create({
      data: {
        tenantId: tenantB.id, driverId: driverB.id, month: '2026-07',
        totalRevenue: 2000, totalCost: 400, payableAmount: 1600, status: 'GENERATED',
      },
    })

    const all = await listAllTenantsSettlements(testDb)

    expect(all).toHaveLength(2)
  })
})

describe('createTenantWithAdmin', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a tenant and an initial TENANT_ADMIN user in one call', async () => {
    const result = await createTenantWithAdmin(testDb, {
      tenantName: '新測試車行',
      adminName: '車行負責人',
      adminEmail: 'owner@new-fleet.dev',
      adminPassword: 'password123',
    })

    expect(result.tenant.name).toBe('新測試車行')
    expect(result.adminUser.email).toBe('owner@new-fleet.dev')
    expect(result.adminUser.role).toBe('TENANT_ADMIN')
    expect(result.adminUser.tenantId).toBe(result.tenant.id)
  })

  it('hashes the admin password rather than storing it in plain text', async () => {
    const result = await createTenantWithAdmin(testDb, {
      tenantName: '新測試車行',
      adminName: '車行負責人',
      adminEmail: 'owner@new-fleet.dev',
      adminPassword: 'password123',
    })

    expect(result.adminUser.passwordHash).not.toBe('password123')
    expect(result.adminUser.passwordHash.length).toBeGreaterThan(20)
  })

  it('rejects creating a second tenant admin with an email already in use', async () => {
    await createTenantWithAdmin(testDb, {
      tenantName: '新測試車行',
      adminName: '車行負責人',
      adminEmail: 'owner@new-fleet.dev',
      adminPassword: 'password123',
    })

    await expect(
      createTenantWithAdmin(testDb, {
        tenantName: '另一間車行',
        adminName: '另一個人',
        adminEmail: 'owner@new-fleet.dev',
        adminPassword: 'password456',
      })
    ).rejects.toThrow()
  })
})

describe('listTenants', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('lists all tenants across the platform', async () => {
    await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    await testDb.tenant.create({ data: { name: 'Other Bus Co' } })

    const tenants = await listTenants(testDb)

    expect(tenants).toHaveLength(2)
  })
})
