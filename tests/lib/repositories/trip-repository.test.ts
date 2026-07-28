import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'

async function seedTenantWithDriverAndVehicle(tenantId: string) {
  const vehicle = await new VehicleRepository(testDb, tenantId).create({
    type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
  })
  const driver = await new DriverRepository(testDb, tenantId).create({ name: '志偉' })
  await new DriverRepository(testDb, tenantId).setDefaultVehicle(driver.id, vehicle.id)
  return { driver, vehicle }
}

describe('TripRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it("creates a trip and auto-attaches the driver's default vehicle", async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver, vehicle } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)

    const trip = await repo.create({
      startDate: new Date('2026-07-26'),
      endDate: new Date('2026-07-26'),
      routeDescription: '台北阿里山',
      passengerCount: 20,
      clientId: client.id,
      bookedById: booker.id,
      driverId: driver.id,
    })

    expect(trip.vehicleId).toBe(vehicle.id)
    expect(trip.status).toBe('PENDING')
  })

  it('throws if the driver has no default vehicle bound', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '無車司機' })
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)

    await expect(
      repo.create({
        startDate: new Date('2026-07-26'),
        endDate: new Date('2026-07-26'),
        routeDescription: '台北阿里山',
        passengerCount: 20,
        clientId: client.id,
        bookedById: booker.id,
        driverId: driver.id,
      })
    ).rejects.toThrow(/default vehicle/)
  })

  it('lists trips overlapping a date range for a driver, including multi-day trips', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-28'),
      routeDescription: '花蓮三日', passengerCount: 20,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })

    const trips = await repo.listOverlappingRange(
      new Date('2026-07-27'), new Date('2026-07-27')
    )

    expect(trips).toHaveLength(1)
    expect(trips[0].routeDescription).toBe('花蓮三日')
  })

  it('transitions status from PENDING to CONFIRMED', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    const trip = await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })

    const updated = await repo.transitionStatus(trip.id, 'CONFIRMED')

    expect(updated.status).toBe('CONFIRMED')
  })

  it('updates client, passenger count, and driver (re-attaching the new default vehicle)', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver: driverA, vehicle: vehicleA } = await seedTenantWithDriverAndVehicle(tenant.id)
    const vehicleB = await new VehicleRepository(testDb, tenant.id).create({
      type: '中巴', plateNumber: 'BBB-002', capacity: 20,
    })
    const driverB = await new DriverRepository(testDb, tenant.id).create({ name: '生哥' })
    await new DriverRepository(testDb, tenant.id).setDefaultVehicle(driverB.id, vehicleB.id)
    const clientA = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const clientB = await new ClientRepository(testDb, tenant.id).create({ name: '雄獅旅遊' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    const trip = await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: clientA.id, bookedById: booker.id, driverId: driverA.id,
    })
    expect(trip.vehicleId).toBe(vehicleA.id)

    const updated = await repo.update(trip.id, {
      clientId: clientB.id, passengerCount: 18, driverId: driverB.id,
    })

    expect(updated.clientId).toBe(clientB.id)
    expect(updated.passengerCount).toBe(18)
    expect(updated.driverId).toBe(driverB.id)
    expect(updated.vehicleId).toBe(vehicleB.id)
  })

  it('rejects updating a trip to a driver with no default vehicle bound', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver: driverA } = await seedTenantWithDriverAndVehicle(tenant.id)
    const driverNoVehicle = await new DriverRepository(testDb, tenant.id).create({ name: '無車司機' })
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    const trip = await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, bookedById: booker.id, driverId: driverA.id,
    })

    await expect(
      repo.update(trip.id, { clientId: client.id, passengerCount: 10, driverId: driverNoVehicle.id })
    ).rejects.toThrow(/default vehicle/)
  })

  it('rejects an illegal status transition from COMPLETED to PENDING', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    const trip = await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })
    await repo.transitionStatus(trip.id, 'CONFIRMED')
    await repo.transitionStatus(trip.id, 'COMPLETED')

    await expect(repo.transitionStatus(trip.id, 'PENDING')).rejects.toThrow(/transition/)
  })
})
