import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'

describe('DriverRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  async function makeTenant(name: string) {
    return testDb.tenant.create({ data: { name } })
  }

  it('creates a driver scoped to a tenant', async () => {
    const tenant = await makeTenant('Tiger Bus')
    const repo = new DriverRepository(testDb, tenant.id)

    const driver = await repo.create({ name: '志偉', phone: '0912345678' })

    expect(driver.name).toBe('志偉')
    expect(driver.tenantId).toBe(tenant.id)
  })

  it('only lists drivers belonging to its own tenant', async () => {
    const tenantA = await makeTenant('Tiger Bus')
    const tenantB = await makeTenant('Other Bus Co')
    await new DriverRepository(testDb, tenantA.id).create({ name: 'A-driver' })
    await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })

    const driversForA = await new DriverRepository(testDb, tenantA.id).list()

    expect(driversForA).toHaveLength(1)
    expect(driversForA[0].name).toBe('A-driver')
  })

  it("returns null when fetching another tenant's driver by id", async () => {
    const tenantA = await makeTenant('Tiger Bus')
    const tenantB = await makeTenant('Other Bus Co')
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })

    const result = await new DriverRepository(testDb, tenantA.id).findById(driverB.id)

    expect(result).toBeNull()
  })

  it("updates a driver's default vehicle only within its own tenant", async () => {
    const tenant = await makeTenant('Tiger Bus')
    const vehicle = await testDb.vehicle.create({
      data: { tenantId: tenant.id, type: '中巴', plateNumber: 'ABC-123', capacity: 20 },
    })
    const repo = new DriverRepository(testDb, tenant.id)
    const driver = await repo.create({ name: '志偉' })

    const updated = await repo.setDefaultVehicle(driver.id, vehicle.id)

    expect(updated.defaultVehicleId).toBe(vehicle.id)
  })
})
