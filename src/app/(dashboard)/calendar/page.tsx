import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { colorTagForClient } from '@/lib/color-tag'
import { CalendarView } from './calendar-view'
import type { CalendarTrip } from '@/lib/calendar/build-calendar-view'

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user?.tenantId) return null

  const rangeStart = new Date()
  rangeStart.setDate(1)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  rangeEnd.setDate(0)

  const tripRepo = new TripRepository(db, session.user.tenantId)
  const trips = await tripRepo.listOverlappingRange(rangeStart, rangeEnd)

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

  return (
    <CalendarView
      trips={calendarTrips}
      rangeStart={rangeStart.toISOString()}
      rangeEnd={rangeEnd.toISOString()}
    />
  )
}
