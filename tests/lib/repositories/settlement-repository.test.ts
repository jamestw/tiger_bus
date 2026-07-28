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

  it('deletes a GENERATED (unpaid) settlement', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)
    const settlement = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })

    await repo.delete(settlement.id)

    const remaining = await repo.listForDriver(driver.id)
    expect(remaining).toHaveLength(0)
  })

  it('rejects deleting a settlement that has already been marked paid', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)
    const settlement = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })
    await repo.markPaid(settlement.id)

    await expect(repo.delete(settlement.id)).rejects.toThrow(/paid|PAID/)
    const remaining = await repo.listForDriver(driver.id)
    expect(remaining).toHaveLength(1)
  })

  it('cannot delete another tenant\'s settlement through a different id', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B司機' })
    const settlementB = await new SettlementRepository(testDb, tenantB.id).generate({
      driverId: driverB.id, month: '2026-07',
      totalRevenue: 1000, totalCost: 0, payableAmount: 1000,
    })
    const repoA = new SettlementRepository(testDb, tenantA.id)

    await expect(repoA.delete(settlementB.id)).rejects.toThrow()
    const remaining = await new SettlementRepository(testDb, tenantB.id).listForDriver(driverB.id)
    expect(remaining).toHaveLength(1)
  })
})
