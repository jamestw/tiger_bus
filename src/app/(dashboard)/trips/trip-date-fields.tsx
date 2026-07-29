'use client'

import { useState } from 'react'

export function TripDateFields({
  defaultStartDate,
  defaultEndDate,
}: {
  defaultStartDate?: string
  defaultEndDate?: string
}) {
  const [endDate, setEndDate] = useState(defaultEndDate ?? defaultStartDate ?? '')
  // A trip whose saved endDate already differs from startDate is a real
  // multi-day trip — don't let picking a new start date silently collapse
  // it back to a single day. Everything else (a fresh form, or an existing
  // single-day trip) stays in "follow the start date" mode.
  const [endTouched, setEndTouched] = useState(
    Boolean(defaultEndDate && defaultStartDate && defaultEndDate !== defaultStartDate)
  )

  return (
    <>
      <div className="field">
        <label>開始日期</label>
        <input
          name="startDate"
          type="date"
          required
          defaultValue={defaultStartDate}
          onChange={(e) => {
            if (!endTouched) setEndDate(e.target.value)
          }}
        />
      </div>
      <div className="field">
        <label>結束日期（跨天才需填，預設跟開始日期同一天）</label>
        <input
          name="endDate"
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndTouched(true)
            setEndDate(e.target.value)
          }}
        />
      </div>
    </>
  )
}
