import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createTrip, listTripsInRange } from './handlers'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rangeStart = new Date(searchParams.get('rangeStart') ?? '')
  const rangeEnd = new Date(searchParams.get('rangeEnd') ?? '')

  const trips = await listTripsInRange(db, session.user, rangeStart, rangeEnd)
  return NextResponse.json(trips)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const trip = await createTrip(db, session.user, {
    ...body,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
  })
  return NextResponse.json(trip, { status: 201 })
}
