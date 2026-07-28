import type { PrismaClient } from '@prisma/client'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { colorTagForClient } from '@/lib/color-tag'
import {
  buildDriverColumnView,
  buildMonthView,
  type CalendarTrip,
} from '@/lib/calendar/build-calendar-view'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function getCalendarView(
  db: PrismaClient,
  session: SessionUser,
  input: { rangeStart: Date; rangeEnd: Date; mode: 'driver-column' | 'month' }
) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'])

  const tripRepo = new TripRepository(db, session.tenantId!)
  let trips = await tripRepo.listOverlappingRange(input.rangeStart, input.rangeEnd)

  if (session.role === 'DRIVER') {
    const driver = await new DriverRepository(db, session.tenantId!).findByUserId(session.id)
    trips = driver ? trips.filter((t) => t.driverId === driver.id) : []
  }

  const driverIds = Array.from(new Set(trips.map((t) => t.driverId)))
  const drivers = await db.driver.findMany({ where: { id: { in: driverIds } } })
  const driverNameById = new Map(drivers.map((d) => [d.id, d.name]))

  const calendarTrips: CalendarTrip[] = trips.map((t) => ({
    id: t.id,
    driverId: t.driverId,
    driverName: driverNameById.get(t.driverId) ?? '未知司機',
    routeDescription: t.routeDescription,
    startDate: t.startDate,
    endDate: t.endDate,
    colorTag: colorTagForClient(t.clientId),
  }))

  const range = { rangeStart: input.rangeStart, rangeEnd: input.rangeEnd }

  if (input.mode === 'driver-column') {
    return { type: 'driver-column' as const, ...buildDriverColumnView(calendarTrips, range) }
  }
  return { type: 'month' as const, ...buildMonthView(calendarTrips, range) }
}
