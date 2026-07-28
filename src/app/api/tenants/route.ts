import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listTenantsHandler, createTenantHandler } from './handlers'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenants = await listTenantsHandler(db, session.user)
  return NextResponse.json(tenants)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = await createTenantHandler(db, session.user, body)
  return NextResponse.json(result, { status: 201 })
}
