import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listCalendarTrips } from '@/app/api/calendar/handlers'
import { TenantRepository } from '@/lib/repositories/tenant-repository'
import { CalendarView } from './calendar-view'
import {
  getCalendarRange,
  shiftAnchor,
  formatDateParam,
  parseDateParam,
  type CalendarMode,
} from '@/lib/calendar/date-range'

function formatRangeLabel(mode: CalendarMode, rangeStart: Date, rangeEnd: Date): string {
  if (mode === 'week') {
    return `${rangeStart.toLocaleDateString('zh-TW')} ～ ${rangeEnd.toLocaleDateString('zh-TW')}`
  }
  return `${rangeStart.getFullYear()} 年 ${rangeStart.getMonth() + 1} 月`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { mode?: string; date?: string }
}) {
  const session = await auth()
  if (!session?.user) return null

  let mode: CalendarMode
  if (searchParams.mode === 'week' || searchParams.mode === 'month') {
    mode = searchParams.mode
  } else {
    const tenant = session.user.tenantId
      ? await new TenantRepository(db, session.user.tenantId).get()
      : null
    mode = tenant?.defaultCalendarView === 'WEEK' ? 'week' : 'month'
  }
  const anchor = searchParams.date ? parseDateParam(searchParams.date) : new Date()

  const { rangeStart, rangeEnd } = getCalendarRange(mode, anchor)
  const prevAnchor = formatDateParam(shiftAnchor(mode, anchor, -1))
  const nextAnchor = formatDateParam(shiftAnchor(mode, anchor, 1))

  const calendarTrips = await listCalendarTrips(db, session.user, rangeStart, rangeEnd)

  return (
    <div>
      <h1>行事曆</h1>

      <div className="btn-group">
        {mode === 'month' ? (
          <button className="btn" disabled>
            月檢視
          </button>
        ) : (
          <a className="btn" href="/calendar?mode=month">
            月檢視
          </a>
        )}
        {mode === 'week' ? (
          <button className="btn" disabled>
            週檢視
          </button>
        ) : (
          <a className="btn" href="/calendar?mode=week">
            週檢視
          </a>
        )}
      </div>

      <div className="calendar-range-nav">
        <a className="btn" href={`/calendar?mode=${mode}&date=${prevAnchor}`}>
          ← {mode === 'week' ? '上一週' : '上個月'}
        </a>
        <span className="calendar-range-nav__label">{formatRangeLabel(mode, rangeStart, rangeEnd)}</span>
        <a className="btn" href={`/calendar?mode=${mode}&date=${nextAnchor}`}>
          {mode === 'week' ? '下一週' : '下個月'} →
        </a>
        <a className="btn" href={`/calendar?mode=${mode}`}>
          回到今天
        </a>
      </div>

      <CalendarView
        trips={calendarTrips}
        rangeStart={rangeStart.toISOString()}
        rangeEnd={rangeEnd.toISOString()}
      />
    </div>
  )
}
