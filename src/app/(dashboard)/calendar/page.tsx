import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listCalendarTrips } from '@/app/api/calendar/handlers'
import { CalendarView } from './calendar-view'

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user) return null

  const rangeStart = new Date()
  rangeStart.setDate(1)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  rangeEnd.setDate(0)

  const calendarTrips = await listCalendarTrips(db, session.user, rangeStart, rangeEnd)

  return (
    <div>
      <h1>行事曆</h1>
      <CalendarView
        trips={calendarTrips}
        rangeStart={rangeStart.toISOString()}
        rangeEnd={rangeEnd.toISOString()}
      />
    </div>
  )
}
