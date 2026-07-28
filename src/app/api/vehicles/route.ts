import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listVehicles, createVehicle } from './handlers'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vehicles = await listVehicles(db, session.user)
  return NextResponse.json(vehicles)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const vehicle = await createVehicle(db, session.user, body)
  return NextResponse.json(vehicle, { status: 201 })
}
