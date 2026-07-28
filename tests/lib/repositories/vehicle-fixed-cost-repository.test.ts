import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { VehicleFixedCostRepository } from '@/lib/repositories/vehicle-fixed-cost-repository'

describe('VehicleFixedCostRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('adds a fixed cost line to a vehicle for a given month', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const vehicle = await new VehicleRepository(testDb, tenant.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const repo = new VehicleFixedCostRepository(testDb, tenant.id)

    const cost = await repo.add({
      vehicleId: vehicle.id, name: '車體險', amount: 4793, month: '2026-06',
    })

    expect(cost.name).toBe('車體險')
    expect(Number(cost.amount)).toBe(4793)
  })

  it('lists fixed costs for a vehicle in a specific month only', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const vehicle = await new VehicleRepository(testDb, tenant.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const repo = new VehicleFixedCostRepository(testDb, tenant.id)
    await repo.add({ vehicleId: vehicle.id, name: '車體險', amount: 4793, month: '2026-06' })
    await repo.add({ vehicleId: vehicle.id, name: '常年會費', amount: 3000, month: '2026-07' })

    const juneCosts = await repo.listForVehicleMonth(vehicle.id, '2026-06')

    expect(juneCosts).toHaveLength(1)
    expect(juneCosts[0].name).toBe('車體險')
  })

  it('rejects adding a cost to a vehicle from another tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const vehicleB = await new VehicleRepository(testDb, tenantB.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const repo = new VehicleFixedCostRepository(testDb, tenantA.id)

    await expect(
      repo.add({ vehicleId: vehicleB.id, name: '車體險', amount: 4793, month: '2026-06' })
    ).rejects.toThrow()
  })
})
