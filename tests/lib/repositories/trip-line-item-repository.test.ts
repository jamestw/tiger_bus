import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'

async function seedTrip(tenantId: string) {
  const vehicle = await new VehicleRepository(testDb, tenantId).create({
    type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
  })
  const driver = await new DriverRepository(testDb, tenantId).create({ name: '志偉' })
  await new DriverRepository(testDb, tenantId).setDefaultVehicle(driver.id, vehicle.id)
  const client = await new ClientRepository(testDb, tenantId).create({ name: '長榮旅行社' })
  const booker = await testDb.user.create({
    data: {
      tenantId, email: 'dispatcher@test.com', passwordHash: 'x',
      name: '調度員', role: 'DISPATCHER',
    },
  })
  return new TripRepository(testDb, tenantId).create({
    startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
    routeDescription: '台北一日', passengerCount: 10,
    clientId: client.id, bookedById: booker.id, driverId: driver.id,
  })
}

describe('TripLineItemRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('adds revenue and cost line items to a trip', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const trip = await seedTrip(tenant.id)
    const repo = new TripLineItemRepository(testDb, tenant.id)

    await repo.add({ tripId: trip.id, type: 'REVENUE', name: '車資', amount: 8000 })
    await repo.add({ tripId: trip.id, type: 'COST', name: '油資', amount: 2500 })

    const items = await repo.listForTrip(trip.id)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.name)).toEqual(expect.arrayContaining(['車資', '油資']))
  })

  it('rejects adding a line item to a trip from another tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const tripB = await seedTrip(tenantB.id)
    const repo = new TripLineItemRepository(testDb, tenantA.id)

    await expect(
      repo.add({ tripId: tripB.id, type: 'REVENUE', name: '車資', amount: 8000 })
    ).rejects.toThrow()
  })
})
