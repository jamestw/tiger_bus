export type CalendarMode = 'month' | 'week'

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return end
}

export function getCalendarRange(mode: CalendarMode, anchor: Date): { rangeStart: Date; rangeEnd: Date } {
  if (mode === 'week') {
    return { rangeStart: startOfWeek(anchor), rangeEnd: endOfWeek(anchor) }
  }
  return { rangeStart: startOfMonth(anchor), rangeEnd: endOfMonth(anchor) }
}

// Local-date-component based (de)serialization for the `date` query param.
// Deliberately NOT toISOString()/`new Date(string)`, which operate in UTC —
// on a server whose local offset is positive (e.g. Asia/Taipei, UTC+8),
// that silently shifts local midnight back a calendar day and breaks
// navigation across month/week boundaries.
export function formatDateParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateParam(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shiftAnchor(mode: CalendarMode, anchor: Date, direction: 1 | -1): Date {
  if (mode === 'week') {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
    d.setDate(d.getDate() + 7 * direction)
    return d
  }
  // Normalize to day 1 before shifting months so JS Date's rollover on
  // short months (e.g. Jan 31 -> Mar 3) can't land us in the wrong month.
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
}
