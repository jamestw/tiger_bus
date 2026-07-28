import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { SettlementRepository } from '@/lib/repositories/settlement-repository'
import { getOperationsOverview } from '@/app/api/overview/handlers'

describe('overview API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it("rolls up the caller's own tenant settlements only", async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverA = await new DriverRepository(testDb, tenantA.id).create({ name: 'A-driver' })
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })
    await new SettlementRepository(testDb, tenantA.id).generate({
      driverId: driverA.id, month: '2026-07', totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })
    await new SettlementRepository(testDb, tenantB.id).generate({
      driverId: driverB.id, month: '2026-07', totalRevenue: 9999, totalCost: 0, payableAmount: 9999,
    })
    const session = { id: 'u1', role: 'ACCOUNTANT' as const, tenantId: tenantA.id }

    const overview = await getOperationsOverview(testDb, session)

    expect(overview).toEqual([
      { month: '2026-07', totalRevenue: 8000, totalCost: 2500, netProfit: 5500 },
    ])
  })

  it('rolls up settlements across all tenants for a SUPERADMIN session', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverA = await new DriverRepository(testDb, tenantA.id).create({ name: 'A-driver' })
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })
    await new SettlementRepository(testDb, tenantA.id).generate({
      driverId: driverA.id, month: '2026-07', totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })
    await new SettlementRepository(testDb, tenantB.id).generate({
      driverId: driverB.id, month: '2026-07', totalRevenue: 2000, totalCost: 500, payableAmount: 1500,
    })
    const session = { id: 'u1', role: 'SUPERADMIN' as const, tenantId: null }

    const overview = await getOperationsOverview(testDb, session)

    expect(overview).toEqual([
      { month: '2026-07', totalRevenue: 10000, totalCost: 3000, netProfit: 7000 },
    ])
  })

  it('rejects a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(getOperationsOverview(testDb, session)).rejects.toThrow()
  })
})
