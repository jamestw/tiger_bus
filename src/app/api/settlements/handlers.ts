import type { PrismaClient } from '@prisma/client'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleFixedCostRepository } from '@/lib/repositories/vehicle-fixed-cost-repository'
import { SettlementRepository } from '@/lib/repositories/settlement-repository'
import { calculateSettlement, type SettlementTrip } from '@/lib/settlement/calculate-settlement'
import { requireRole, type SessionUser } from '@/lib/rbac'

function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split('-').map(Number)
  const start = new Date(year, monthNum - 1, 1)
  const end = new Date(year, monthNum, 0)
  return { start, end }
}

export async function generateSettlement(
  db: PrismaClient,
  session: SessionUser,
  input: { driverId: string; month: string }
) {
  requireRole(session, ['TENANT_ADMIN', 'ACCOUNTANT'])

  const tenantId = session.tenantId!
  const driver = await new DriverRepository(db, tenantId).findById(input.driverId)
  if (!driver) throw new Error(`Driver ${input.driverId} not found in tenant ${tenantId}`)

  const { start, end } = monthRange(input.month)
  const tripRepo = new TripRepository(db, tenantId)
  const lineItemRepo = new TripLineItemRepository(db, tenantId)
  const driverTrips = (await tripRepo.listOverlappingRange(start, end)).filter(
    (t) => t.driverId === input.driverId
  )

  const trips: SettlementTrip[] = await Promise.all(
    driverTrips.map(async (trip) => ({
      id: trip.id,
      startDate: trip.startDate,
      status: trip.status,
      lineItems: (await lineItemRepo.listForTrip(trip.id)).map((li) => ({
        type: li.type,
        amount: Number(li.amount),
      })),
    }))
  )

  const fixedCosts = driver.defaultVehicleId
    ? (
        await new VehicleFixedCostRepository(db, tenantId).listForVehicleMonth(
          driver.defaultVehicleId,
          input.month
        )
      ).map((c) => ({ name: c.name, amount: Number(c.amount) }))
    : []

  const result = calculateSettlement({ trips, fixedCosts, month: input.month })

  return new SettlementRepository(db, tenantId).generate({
    driverId: input.driverId,
    month: input.month,
    ...result,
  })
}

export async function markSettlementPaid(db: PrismaClient, session: SessionUser, settlementId: string) {
  requireRole(session, ['TENANT_ADMIN', 'ACCOUNTANT'])
  return new SettlementRepository(db, session.tenantId!).markPaid(settlementId)
}

export async function listSettlementsForDriver(
  db: PrismaClient,
  session: SessionUser,
  driverId: string
) {
  requireRole(session, ['TENANT_ADMIN', 'ACCOUNTANT', 'DRIVER'])

  if (session.role === 'DRIVER') {
    const callerDriver = await new DriverRepository(db, session.tenantId!).findByUserId(session.id)
    if (!callerDriver || callerDriver.id !== driverId) return []
  }

  return new SettlementRepository(db, session.tenantId!).listForDriver(driverId)
}
