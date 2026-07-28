import type { PrismaClient, LineItemType } from '@prisma/client'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function addTripLineItem(
  db: PrismaClient,
  session: SessionUser,
  tripId: string,
  input: { type: LineItemType; name: string; amount: number }
) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'])
  return new TripLineItemRepository(db, session.tenantId!).add({ tripId, ...input })
}

export async function listTripLineItems(db: PrismaClient, session: SessionUser, tripId: string) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'])
  return new TripLineItemRepository(db, session.tenantId!).listForTrip(tripId)
}
