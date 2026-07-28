import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listDrivers, createDriver } from './handlers'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const drivers = await listDrivers(db, session.user)
  return NextResponse.json(drivers)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const driver = await createDriver(db, session.user, body)
  return NextResponse.json(driver, { status: 201 })
}
