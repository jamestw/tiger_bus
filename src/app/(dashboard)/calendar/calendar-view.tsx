'use client'

import { useMemo, useState } from 'react'
import {
  buildDriverColumnView,
  buildMonthView,
  type CalendarTrip,
} from '@/lib/calendar/build-calendar-view'

export function CalendarView({
  trips,
  rangeStart,
  rangeEnd,
}: {
  trips: CalendarTrip[]
  rangeStart: string
  rangeEnd: string
}) {
  const [mode, setMode] = useState<'driver-column' | 'month'>('driver-column')

  const range = useMemo(
    () => ({ rangeStart: new Date(rangeStart), rangeEnd: new Date(rangeEnd) }),
    [rangeStart, rangeEnd]
  )

  const parsedTrips = useMemo(
    () => trips.map((t) => ({ ...t, startDate: new Date(t.startDate), endDate: new Date(t.endDate) })),
    [trips]
  )

  return (
    <div>
      <button onClick={() => setMode('driver-column')} disabled={mode === 'driver-column'}>
        司機為欄
      </button>
      <button onClick={() => setMode('month')} disabled={mode === 'month'}>
        月曆式
      </button>

      {mode === 'driver-column' ? (
        <DriverColumnTable trips={parsedTrips} range={range} />
      ) : (
        <MonthTable trips={parsedTrips} range={range} />
      )}
    </div>
  )
}

function DriverColumnTable({
  trips,
  range,
}: {
  trips: CalendarTrip[]
  range: { rangeStart: Date; rangeEnd: Date }
}) {
  const view = buildDriverColumnView(trips, range)
  return (
    <table>
      <thead>
        <tr>
          <th>日期</th>
          {view.drivers.map((d) => (
            <th key={d.driverId}>{d.driverName}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {view.rows.map((row) => (
          <tr key={row.date.toISOString()}>
            <td>{row.date.toLocaleDateString('zh-TW')}</td>
            {row.cells.map((cell) => (
              <td key={cell.driverId}>
                {cell.trips.map((t) => (
                  <div key={t.tripId} style={{ background: t.colorTag }}>
                    {t.routeDescription} ({t.dayIndex}/{t.totalDays})
                  </div>
                ))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MonthTable({
  trips,
  range,
}: {
  trips: CalendarTrip[]
  range: { rangeStart: Date; rangeEnd: Date }
}) {
  const view = buildMonthView(trips, range)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
      {view.days.map((day) => (
        <div key={day.date.toISOString()} style={{ border: '1px solid #ccc', minHeight: 80 }}>
          <strong>{day.date.getDate()}</strong>
          {day.trips.map((t) => (
            <div key={t.tripId} style={{ background: t.colorTag }}>
              {t.routeDescription}（{t.driverName}）第{t.dayIndex}天
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
