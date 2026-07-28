export interface CalendarTrip {
  id: string
  driverId: string
  driverName: string
  routeDescription: string
  startDate: Date
  endDate: Date
  colorTag: string
}

export interface DateRange {
  rangeStart: Date
  rangeEnd: Date
}

interface TripOccurrence {
  tripId: string
  routeDescription: string
  colorTag: string
  dayIndex: number
  totalDays: number
}

interface DriverColumnCell {
  driverId: string
  trips: TripOccurrence[]
}

interface DriverColumnRow {
  date: Date
  cells: DriverColumnCell[]
}

interface DriverColumnView {
  drivers: { driverId: string; driverName: string }[]
  rows: DriverColumnRow[]
}

interface MonthViewDay {
  date: Date
  trips: (TripOccurrence & { driverId: string; driverName: string })[]
}

interface MonthView {
  days: MonthViewDay[]
}

function eachDate(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function daysInTrip(trip: CalendarTrip): Date[] {
  return eachDate(trip.startDate, trip.endDate)
}

function occurrenceFor(trip: CalendarTrip, date: Date): TripOccurrence {
  const tripDays = daysInTrip(trip)
  const totalDays = tripDays.length
  const dayIndex = tripDays.findIndex((d) => d.toDateString() === date.toDateString()) + 1
  return {
    tripId: trip.id,
    routeDescription: trip.routeDescription,
    colorTag: trip.colorTag,
    dayIndex,
    totalDays,
  }
}

function tripOverlapsRange(trip: CalendarTrip, range: DateRange): boolean {
  return trip.startDate <= range.rangeEnd && trip.endDate >= range.rangeStart
}

export function buildDriverColumnView(trips: CalendarTrip[], range: DateRange): DriverColumnView {
  const relevantTrips = trips.filter((t) => tripOverlapsRange(t, range))
  const drivers = Array.from(
    new Map(relevantTrips.map((t) => [t.driverId, { driverId: t.driverId, driverName: t.driverName }])).values()
  )
  const rangeDates = eachDate(range.rangeStart, range.rangeEnd)

  const rows: DriverColumnRow[] = rangeDates.map((date) => ({
    date,
    cells: drivers.map((driver) => ({
      driverId: driver.driverId,
      trips: relevantTrips
        .filter((t) => t.driverId === driver.driverId && daysInTrip(t).some((d) => d.toDateString() === date.toDateString()))
        .map((t) => occurrenceFor(t, date)),
    })),
  }))

  return { drivers, rows }
}

export function buildMonthView(trips: CalendarTrip[], range: DateRange): MonthView {
  const relevantTrips = trips.filter((t) => tripOverlapsRange(t, range))
  const rangeDates = eachDate(range.rangeStart, range.rangeEnd)

  const days: MonthViewDay[] = rangeDates.map((date) => ({
    date,
    trips: relevantTrips
      .filter((t) => daysInTrip(t).some((d) => d.toDateString() === date.toDateString()))
      .map((t) => ({ ...occurrenceFor(t, date), driverId: t.driverId, driverName: t.driverName })),
  }))

  return { days }
}
