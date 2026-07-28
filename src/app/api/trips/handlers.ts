import type { PrismaClient } from '@prisma/client'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function createTrip(
  db: PrismaClient,
  session: SessionUser,
  input: {
    startDate: Date
    endDate: Date
    routeDescription: string
    passengerCount: number
    clientId: string
    driverId: string
  }
) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER'])
  return new TripRepository(db, session.tenantId!).create({
    ...input,
    bookedById: session.id,
  })
}

export async function listTripsInRange(
  db: PrismaClient,
  session: SessionUser,
  rangeStart: Date,
  rangeEnd: Date
) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'])
  const tripRepo = new TripRepository(db, session.tenantId!)
  const trips = await tripRepo.listOverlappingRange(rangeStart, rangeEnd)

  if (session.role !== 'DRIVER') return trips

  const driver = await new DriverRepository(db, session.tenantId!).findByUserId(session.id)
  if (!driver) return []
  return trips.filter((trip) => trip.driverId === driver.id)
}
