import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { getCalendarView } from '@/app/api/calendar/handlers'

describe('calendar API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('builds a driver-column view from persisted trips, with color tags applied', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const vehicle = await new VehicleRepository(testDb, tenant.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    await new DriverRepository(testDb, tenant.id).setDefaultVehicle(driver.id, vehicle.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    await new TripRepository(testDb, tenant.id).create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-28'),
      routeDescription: '花蓮三日', passengerCount: 20,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })
    const session = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }

    const view = await getCalendarView(testDb, session, {
      rangeStart: new Date('2026-07-26'), rangeEnd: new Date('2026-07-28'), mode: 'driver-column',
    })

    expect(view.type).toBe('driver-column')
    if (view.type === 'driver-column') {
      expect(view.drivers).toHaveLength(1)
      expect(view.drivers[0].driverName).toBe('志偉')
    }
  })
})
