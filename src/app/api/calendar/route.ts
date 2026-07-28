import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCalendarView } from './handlers'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rangeStart = new Date(searchParams.get('rangeStart') ?? '')
  const rangeEnd = new Date(searchParams.get('rangeEnd') ?? '')
  const mode = searchParams.get('mode') === 'month' ? 'month' : 'driver-column'

  const view = await getCalendarView(db, session.user, { rangeStart, rangeEnd, mode })
  return NextResponse.json(view)
}
