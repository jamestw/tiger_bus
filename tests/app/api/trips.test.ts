import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { createTrip, updateTrip, listTripsInRange } from '@/app/api/trips/handlers'

async function seedTenantWithDriverAndVehicle(tenantId: string) {
  const vehicle = await new VehicleRepository(testDb, tenantId).create({
    type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
  })
  const driver = await new DriverRepository(testDb, tenantId).create({ name: '志偉' })
  await new DriverRepository(testDb, tenantId).setDefaultVehicle(driver.id, vehicle.id)
  return { driver, vehicle }
}

describe('trips API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a trip as DISPATCHER and lists it for ACCOUNTANT', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const dispatcherUser = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const dispatcherSession = { id: dispatcherUser.id, role: 'DISPATCHER' as const, tenantId: tenant.id }
    const accountantSession = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    await createTrip(testDb, dispatcherSession, {
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, driverId: driver.id,
    })

    const trips = await listTripsInRange(
      testDb, accountantSession, new Date('2026-07-01'), new Date('2026-07-31')
    )

    expect(trips).toHaveLength(1)
    expect(trips[0].routeDescription).toBe('台北一日')
  })

  it('updates a trip (client, passenger count, driver) as TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver: driverA } = await seedTenantWithDriverAndVehicle(tenant.id)
    const vehicleB = await new VehicleRepository(testDb, tenant.id).create({
      type: '中巴', plateNumber: 'BBB-002', capacity: 20,
    })
    const driverB = await new DriverRepository(testDb, tenant.id).create({ name: '生哥' })
    await new DriverRepository(testDb, tenant.id).setDefaultVehicle(driverB.id, vehicleB.id)
    const clientA = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const clientB = await new ClientRepository(testDb, tenant.id).create({ name: '雄獅旅遊' })
    const adminUser = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'admin@test.com', passwordHash: 'x',
        name: '車行管理者', role: 'TENANT_ADMIN',
      },
    })
    const adminSession = { id: adminUser.id, role: 'TENANT_ADMIN' as const, tenantId: tenant.id }

    const trip = await createTrip(testDb, adminSession, {
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: clientA.id, driverId: driverA.id,
    })

    const updated = await updateTrip(testDb, adminSession, trip.id, {
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-27'),
      clientId: clientB.id, passengerCount: 22, driverId: driverB.id,
    })

    expect(updated.clientId).toBe(clientB.id)
    expect(updated.passengerCount).toBe(22)
    expect(updated.driverId).toBe(driverB.id)
    expect(updated.vehicleId).toBe(vehicleB.id)
    expect(updated.endDate).toEqual(new Date('2026-07-27'))
  })

  it('rejects trip update from an ACCOUNTANT-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const adminUser = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'admin2@test.com', passwordHash: 'x',
        name: '車行管理者', role: 'TENANT_ADMIN',
      },
    })
    const adminSession = { id: adminUser.id, role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const accountantSession = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    const trip = await createTrip(testDb, adminSession, {
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, driverId: driver.id,
    })

    await expect(
      updateTrip(testDb, accountantSession, trip.id, {
        startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
        clientId: client.id, passengerCount: 99, driverId: driver.id,
      })
    ).rejects.toThrow()
  })

  it('rejects trip creation from an ACCOUNTANT-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const session = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    await expect(
      createTrip(testDb, session, {
        startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
        routeDescription: '台北一日', passengerCount: 10,
        clientId: client.id, driverId: driver.id,
      })
    ).rejects.toThrow()
  })

  it('filters trips to only the caller\'s own when the session role is DRIVER', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver: driverA } = await seedTenantWithDriverAndVehicle(tenant.id)
    const vehicleB = await new VehicleRepository(testDb, tenant.id).create({
      type: '中巴', plateNumber: 'BBB-002', capacity: 20,
    })
    const driverB = await new DriverRepository(testDb, tenant.id).create({ name: '生哥' })
    await new DriverRepository(testDb, tenant.id).setDefaultVehicle(driverB.id, vehicleB.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const dispatcherUser = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const dispatcherSession = { id: dispatcherUser.id, role: 'DISPATCHER' as const, tenantId: tenant.id }

    await createTrip(testDb, dispatcherSession, {
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '志偉的行程', passengerCount: 10,
      clientId: client.id, driverId: driverA.id,
    })
    await createTrip(testDb, dispatcherSession, {
      startDate: new Date('2026-07-27'), endDate: new Date('2026-07-27'),
      routeDescription: '生哥的行程', passengerCount: 8,
      clientId: client.id, driverId: driverB.id,
    })

    const driverAUser = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'driverA@test.com', passwordHash: 'x',
        name: '志偉', role: 'DRIVER',
      },
    })
    await testDb.driver.update({ where: { id: driverA.id }, data: { userId: driverAUser.id } })
    const driverASession = { id: driverAUser.id, role: 'DRIVER' as const, tenantId: tenant.id }

    const trips = await listTripsInRange(
      testDb, driverASession, new Date('2026-07-01'), new Date('2026-07-31')
    )

    expect(trips).toHaveLength(1)
    expect(trips[0].routeDescription).toBe('志偉的行程')
  })
})
