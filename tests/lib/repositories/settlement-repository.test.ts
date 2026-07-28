import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { SettlementRepository } from '@/lib/repositories/settlement-repository'

describe('SettlementRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('generates and persists a settlement for a driver and month', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)

    const settlement = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })

    expect(settlement.status).toBe('GENERATED')
    expect(Number(settlement.payableAmount)).toBe(5500)
  })

  it('regenerating for the same driver and month overwrites the previous draft', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)
    await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })

    const regenerated = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 9000, totalCost: 2500, payableAmount: 6500,
    })

    expect(Number(regenerated.payableAmount)).toBe(6500)
    const all = await repo.listForDriver(driver.id)
    expect(all).toHaveLength(1)
  })

  it('marks a settlement as paid', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)
    const settlement = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })

    const paid = await repo.markPaid(settlement.id)

    expect(paid.status).toBe('PAID')
    expect(paid.paidAt).not.toBeNull()
  })
})
