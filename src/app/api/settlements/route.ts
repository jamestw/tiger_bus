import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateSettlement, markSettlementPaid, listSettlementsForDriver } from './handlers'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const driverId = searchParams.get('driverId')
  if (!driverId) return NextResponse.json({ error: 'driverId is required' }, { status: 400 })

  const settlements = await listSettlementsForDriver(db, session.user, driverId)
  return NextResponse.json(settlements)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const settlement = await generateSettlement(db, session.user, body)
  return NextResponse.json(settlement, { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const settlement = await markSettlementPaid(db, session.user, body.settlementId)
  return NextResponse.json(settlement)
}
