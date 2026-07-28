import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { addTripLineItem } from '@/app/api/trips/[tripId]/line-items/handlers'

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

describe('trip line items API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('adds a line item to a trip as ACCOUNTANT', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const trip = await seedTrip(tenant.id)
    const session = { id: 'u1', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    const item = await addTripLineItem(testDb, session, trip.id, {
      type: 'REVENUE', name: '車資', amount: 8000,
    })

    expect(item.name).toBe('車資')
  })

  it('rejects adding a line item from a DRIVER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const trip = await seedTrip(tenant.id)
    const session = { id: 'u1', role: 'DRIVER' as const, tenantId: tenant.id }

    await expect(
      addTripLineItem(testDb, session, trip.id, { type: 'REVENUE', name: '車資', amount: 8000 })
    ).rejects.toThrow()
  })
})
