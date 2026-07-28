import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { VehicleFixedCostRepository } from '@/lib/repositories/vehicle-fixed-cost-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'
import { generateSettlement, markSettlementPaid, deleteSettlement } from '@/app/api/settlements/handlers'

async function seedCompletedTripWithLineItems(tenantId: string) {
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
  const tripRepo = new TripRepository(testDb, tenantId)
  const trip = await tripRepo.create({
    startDate: new Date('2026-07-05'), endDate: new Date('2026-07-05'),
    routeDescription: '台北一日', passengerCount: 10,
    clientId: client.id, bookedById: booker.id, driverId: driver.id,
  })
  await tripRepo.transitionStatus(trip.id, 'CONFIRMED')
  await tripRepo.transitionStatus(trip.id, 'COMPLETED')
  const lineItemRepo = new TripLineItemRepository(testDb, tenantId)
  await lineItemRepo.add({ tripId: trip.id, type: 'REVENUE', name: '車資', amount: 8000 })
  await lineItemRepo.add({ tripId: trip.id, type: 'COST', name: '油資', amount: 2500 })
  await new VehicleFixedCostRepository(testDb, tenantId).add({
    vehicleId: vehicle.id, name: '車體險', amount: 1000, month: '2026-07',
  })

  return { driver }
}

describe('settlements API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('generates a settlement combining trip line items and vehicle fixed costs', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedCompletedTripWithLineItems(tenant.id)
    const session = { id: 'u1', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    const settlement = await generateSettlement(testDb, session, {
      driverId: driver.id, month: '2026-07',
    })

    expect(Number(settlement.totalRevenue)).toBe(8000)
    expect(Number(settlement.totalCost)).toBe(3500)
    expect(Number(settlement.payableAmount)).toBe(4500)
  })

  it('rejects settlement generation from a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedCompletedTripWithLineItems(tenant.id)
    const session = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(
      generateSettlement(testDb, session, { driverId: driver.id, month: '2026-07' })
    ).rejects.toThrow()
  })

  it('marks a settlement as paid', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedCompletedTripWithLineItems(tenant.id)
    const session = { id: 'u1', role: 'ACCOUNTANT' as const, tenantId: tenant.id }
    const settlement = await generateSettlement(testDb, session, {
      driverId: driver.id, month: '2026-07',
    })

    const paid = await markSettlementPaid(testDb, session, settlement.id)

    expect(paid.status).toBe('PAID')
  })

  it('deletes a GENERATED settlement as TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedCompletedTripWithLineItems(tenant.id)
    const session = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const settlement = await generateSettlement(testDb, session, {
      driverId: driver.id, month: '2026-07',
    })

    await deleteSettlement(testDb, session, settlement.id)

    const remaining = await testDb.settlementRecord.findUnique({ where: { id: settlement.id } })
    expect(remaining).toBeNull()
  })

  it('rejects deleting a settlement from a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedCompletedTripWithLineItems(tenant.id)
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const settlement = await generateSettlement(testDb, adminSession, {
      driverId: driver.id, month: '2026-07',
    })
    const dispatcherSession = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(deleteSettlement(testDb, dispatcherSession, settlement.id)).rejects.toThrow()
  })

  it('rejects deleting a settlement that has been marked paid', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedCompletedTripWithLineItems(tenant.id)
    const session = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const settlement = await generateSettlement(testDb, session, {
      driverId: driver.id, month: '2026-07',
    })
    await markSettlementPaid(testDb, session, settlement.id)

    await expect(deleteSettlement(testDb, session, settlement.id)).rejects.toThrow()
  })
})
