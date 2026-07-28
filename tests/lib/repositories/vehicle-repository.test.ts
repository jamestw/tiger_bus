import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'

describe('VehicleRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a vehicle scoped to a tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new VehicleRepository(testDb, tenant.id)

    const vehicle = await repo.create({
      type: '大巴',
      plateNumber: 'KKA-9217',
      capacity: 45,
      lastInspectionDate: new Date('2026-05-01'),
    })

    expect(vehicle.plateNumber).toBe('KKA-9217')
    expect(vehicle.tenantId).toBe(tenant.id)
  })

  it('rejects a duplicate plate number within the same tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new VehicleRepository(testDb, tenant.id)
    await repo.create({ type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })

    await expect(
      repo.create({ type: '中巴', plateNumber: 'KKA-9217', capacity: 20 })
    ).rejects.toThrow()
  })

  it('allows the same plate number across different tenants', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    await new VehicleRepository(testDb, tenantA.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })

    const vehicle = await new VehicleRepository(testDb, tenantB.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })

    expect(vehicle.plateNumber).toBe('KKA-9217')
  })

  it("lists only its own tenant's vehicles", async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    await new VehicleRepository(testDb, tenantA.id).create({
      type: '大巴', plateNumber: 'AAA-001', capacity: 45,
    })
    await new VehicleRepository(testDb, tenantB.id).create({
      type: '大巴', plateNumber: 'BBB-002', capacity: 45,
    })

    const vehicles = await new VehicleRepository(testDb, tenantA.id).list()

    expect(vehicles).toHaveLength(1)
    expect(vehicles[0].plateNumber).toBe('AAA-001')
  })

  it('updates a vehicle scoped to its own tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new VehicleRepository(testDb, tenant.id)
    const vehicle = await repo.create({ type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })

    const updated = await repo.update(vehicle.id, {
      type: '中巴', plateNumber: 'KKA-9217', capacity: 30,
      lastInspectionDate: new Date('2026-06-01'),
    })

    expect(updated.type).toBe('中巴')
    expect(updated.capacity).toBe(30)
  })

  it('rejects updating a vehicle from another tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const vehicleB = await new VehicleRepository(testDb, tenantB.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })

    await expect(
      new VehicleRepository(testDb, tenantA.id).update(vehicleB.id, {
        type: '中巴', plateNumber: 'KKA-9217', capacity: 30,
      })
    ).rejects.toThrow()
  })

  it('soft-deletes a vehicle and excludes it from list()', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new VehicleRepository(testDb, tenant.id)
    const vehicle = await repo.create({ type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })

    await repo.softDelete(vehicle.id)
    const vehicles = await repo.list()

    expect(vehicles).toHaveLength(0)
  })

  it('still includes soft-deleted vehicles in listAll()', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new VehicleRepository(testDb, tenant.id)
    const vehicle = await repo.create({ type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })
    await repo.softDelete(vehicle.id)

    const all = await repo.listAll()

    expect(all).toHaveLength(1)
    expect(all[0].deletedAt).not.toBeNull()
  })
})
