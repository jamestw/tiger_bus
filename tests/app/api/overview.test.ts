import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { SettlementRepository } from '@/lib/repositories/settlement-repository'
import { getOperationsOverview, getRecentTrips } from '@/app/api/overview/handlers'

describe('overview API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it("rolls up the caller's own tenant settlements only", async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverA = await new DriverRepository(testDb, tenantA.id).create({ name: 'A-driver' })
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })
    await new SettlementRepository(testDb, tenantA.id).generate({
      driverId: driverA.id, month: '2026-07', totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })
    await new SettlementRepository(testDb, tenantB.id).generate({
      driverId: driverB.id, month: '2026-07', totalRevenue: 9999, totalCost: 0, payableAmount: 9999,
    })
    const session = { id: 'u1', role: 'ACCOUNTANT' as const, tenantId: tenantA.id }

    const overview = await getOperationsOverview(testDb, session)

    expect(overview).toEqual([
      { month: '2026-07', totalRevenue: 8000, totalCost: 2500, netProfit: 5500 },
    ])
  })

  it('rolls up settlements across all tenants for a SUPERADMIN session', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverA = await new DriverRepository(testDb, tenantA.id).create({ name: 'A-driver' })
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })
    await new SettlementRepository(testDb, tenantA.id).generate({
      driverId: driverA.id, month: '2026-07', totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })
    await new SettlementRepository(testDb, tenantB.id).generate({
      driverId: driverB.id, month: '2026-07', totalRevenue: 2000, totalCost: 500, payableAmount: 1500,
    })
    const session = { id: 'u1', role: 'SUPERADMIN' as const, tenantId: null }

    const overview = await getOperationsOverview(testDb, session)

    expect(overview).toEqual([
      { month: '2026-07', totalRevenue: 10000, totalCost: 3000, netProfit: 7000 },
    ])
  })

  it('rejects a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(getOperationsOverview(testDb, session)).rejects.toThrow()
  })

  it('returns the recent trips with client/driver/vehicle details for TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const vehicle = await new VehicleRepository(testDb, tenant.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉', phone: '0911-222-333' })
    await new DriverRepository(testDb, tenant.id).setDefaultVehicle(driver.id, vehicle.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    await new TripRepository(testDb, tenant.id).create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })
    const session = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }

    const trips = await getRecentTrips(testDb, session, 5)

    expect(trips).toHaveLength(1)
    expect(trips[0].routeDescription).toBe('台北一日')
    expect(trips[0].client.name).toBe('長榮旅行社')
    expect(trips[0].driver.phone).toBe('0911-222-333')
    expect(trips[0].vehicle.type).toBe('大巴')
  })

  it('rejects a DISPATCHER-role session for recent trips', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(getRecentTrips(testDb, session, 5)).rejects.toThrow()
  })
})
