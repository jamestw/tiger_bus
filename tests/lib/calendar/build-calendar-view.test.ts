import { describe, it, expect } from 'vitest'
import { buildDriverColumnView, buildMonthView, type CalendarTrip } from '@/lib/calendar/build-calendar-view'

const multiDayTrip: CalendarTrip = {
  id: 'trip-1',
  driverId: 'driver-1',
  driverName: '志偉',
  routeDescription: '花蓮三日',
  startDate: new Date('2026-07-26'),
  endDate: new Date('2026-07-28'),
  colorTag: '#ffe9a8',
}

const oneDayTrip: CalendarTrip = {
  id: 'trip-2',
  driverId: 'driver-2',
  driverName: '生哥',
  routeDescription: '台北一日',
  startDate: new Date('2026-07-27'),
  endDate: new Date('2026-07-27'),
  colorTag: '#c9f0d0',
}

describe('buildDriverColumnView', () => {
  it('places a one-day trip in exactly one cell', () => {
    const view = buildDriverColumnView([oneDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const cellsWithTrip = view.rows.flatMap((row) =>
      row.cells.filter((cell) => cell.trips.some((t) => t.tripId === 'trip-2'))
    )
    expect(cellsWithTrip).toHaveLength(1)
  })

  it('spans a multi-day trip across every date row it covers, for the same driver column', () => {
    const view = buildDriverColumnView([multiDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const cellsWithTrip = view.rows.flatMap((row) =>
      row.cells.filter((cell) => cell.trips.some((t) => t.tripId === 'trip-1'))
    )
    expect(cellsWithTrip).toHaveLength(3)
    expect(cellsWithTrip.every((cell) => cell.driverId === 'driver-1')).toBe(true)
  })

  it('marks day-index within a multi-day span (1/3, 2/3, 3/3)', () => {
    const view = buildDriverColumnView([multiDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const dayLabels = view.rows
      .flatMap((row) => row.cells)
      .flatMap((cell) => cell.trips)
      .filter((t) => t.tripId === 'trip-1')
      .map((t) => `${t.dayIndex}/${t.totalDays}`)
      .sort()

    expect(dayLabels).toEqual(['1/3', '2/3', '3/3'])
  })
})

describe('buildMonthView', () => {
  it('lists a multi-day trip on every date it covers', () => {
    const view = buildMonthView([multiDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const daysWithTrip = view.days.filter((day) =>
      day.trips.some((t) => t.tripId === 'trip-1')
    )
    expect(daysWithTrip).toHaveLength(3)
  })

  it('lists multiple trips on the same day if they overlap', () => {
    const view = buildMonthView([multiDayTrip, oneDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const july27 = view.days.find((d) => d.date.toISOString().slice(0, 10) === '2026-07-27')
    expect(july27?.trips).toHaveLength(2)
  })
})
