import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { addTripLineItem, listTripLineItems } from './handlers'

export async function GET(request: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await listTripLineItems(db, session.user, params.tripId)
  return NextResponse.json(items)
}

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const item = await addTripLineItem(db, session.user, params.tripId, body)
  return NextResponse.json(item, { status: 201 })
}
