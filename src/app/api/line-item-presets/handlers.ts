import type { PrismaClient, LineItemType } from '@prisma/client'
import { LineItemPresetRepository } from '@/lib/repositories/line-item-preset-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listLineItemPresets(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'])
  return new LineItemPresetRepository(db, session.tenantId!).list()
}

export async function createLineItemPreset(
  db: PrismaClient,
  session: SessionUser,
  input: { name: string; type: LineItemType }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new LineItemPresetRepository(db, session.tenantId!).create(input)
}

export async function deleteLineItemPreset(db: PrismaClient, session: SessionUser, presetId: string) {
  requireRole(session, ['TENANT_ADMIN'])
  return new LineItemPresetRepository(db, session.tenantId!).delete(presetId)
}
