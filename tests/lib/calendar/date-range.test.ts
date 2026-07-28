import { describe, it, expect } from 'vitest'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  getCalendarRange,
  shiftAnchor,
  formatDateParam,
  parseDateParam,
} from '@/lib/calendar/date-range'

describe('startOfMonth / endOfMonth', () => {
  it('returns the 1st and last day of the month containing the date', () => {
    expect(startOfMonth(new Date('2026-07-15'))).toEqual(new Date(2026, 6, 1))
    expect(endOfMonth(new Date('2026-07-15'))).toEqual(new Date(2026, 6, 31))
  })

  it('handles a 30-day and a leap-year February month correctly', () => {
    expect(endOfMonth(new Date('2026-04-10'))).toEqual(new Date(2026, 3, 30))
    expect(endOfMonth(new Date('2028-02-01'))).toEqual(new Date(2028, 1, 29))
  })
})

describe('startOfWeek / endOfWeek (Monday-start)', () => {
  it('returns the preceding Monday for a mid-week date', () => {
    // 2026-07-29 is a Wednesday
    expect(startOfWeek(new Date(2026, 6, 29))).toEqual(new Date(2026, 6, 27))
    expect(endOfWeek(new Date(2026, 6, 29))).toEqual(new Date(2026, 7, 2))
  })

  it('returns the preceding Monday when the date itself is a Sunday', () => {
    // 2026-08-02 is a Sunday
    expect(startOfWeek(new Date(2026, 7, 2))).toEqual(new Date(2026, 6, 27))
  })

  it('returns itself as the start when the date is already a Monday', () => {
    // 2026-07-27 is a Monday
    expect(startOfWeek(new Date(2026, 6, 27))).toEqual(new Date(2026, 6, 27))
  })
})

describe('getCalendarRange', () => {
  it('returns the month range for mode=month', () => {
    const { rangeStart, rangeEnd } = getCalendarRange('month', new Date(2026, 6, 15))
    expect(rangeStart).toEqual(new Date(2026, 6, 1))
    expect(rangeEnd).toEqual(new Date(2026, 6, 31))
  })

  it('returns the week range for mode=week', () => {
    const { rangeStart, rangeEnd } = getCalendarRange('week', new Date(2026, 6, 29))
    expect(rangeStart).toEqual(new Date(2026, 6, 27))
    expect(rangeEnd).toEqual(new Date(2026, 7, 2))
  })
})

describe('shiftAnchor', () => {
  it('shifts a week anchor by 7 days forward and backward', () => {
    const anchor = new Date(2026, 6, 29)
    expect(shiftAnchor('week', anchor, 1)).toEqual(new Date(2026, 7, 5))
    expect(shiftAnchor('week', anchor, -1)).toEqual(new Date(2026, 6, 22))
  })

  it('shifts a month anchor by one month forward and backward', () => {
    const anchor = new Date(2026, 6, 15)
    expect(shiftAnchor('month', anchor, 1)).toEqual(new Date(2026, 7, 1))
    expect(shiftAnchor('month', anchor, -1)).toEqual(new Date(2026, 5, 1))
  })

  it('does not roll over into the wrong month when the anchor is on the 31st', () => {
    // Naive Date#setMonth on Jan 31 -> Feb rolls into March. Must not happen here.
    const anchor = new Date(2026, 0, 31)
    expect(shiftAnchor('month', anchor, 1)).toEqual(new Date(2026, 1, 1))
  })
})

describe('formatDateParam / parseDateParam', () => {
  it('round-trips a local date through the query-param string unchanged', () => {
    const date = new Date(2026, 11, 31) // Dec 31 2026, local
    expect(formatDateParam(date)).toBe('2026-12-31')
    expect(parseDateParam('2026-12-31')).toEqual(date)
  })

  it('pads single-digit months and days', () => {
    expect(formatDateParam(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('does not shift the date across a month boundary regardless of UTC offset', () => {
    // This is a regression check for the toISOString()-based bug: formatting
    // the 1st of a month must never come back as the last day of the month
    // before, which is what UTC conversion caused for positive-offset zones.
    const firstOfMonth = new Date(2027, 0, 1) // Jan 1 2027, local
    expect(formatDateParam(firstOfMonth)).toBe('2027-01-01')
  })
})
