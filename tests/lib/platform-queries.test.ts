import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../support/test-db'
import { listAllTenantsSettlements } from '@/lib/platform-queries'

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
