import type { PrismaClient } from '@prisma/client'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listClients(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'])
  return new ClientRepository(db, session.tenantId!).list()
}

export async function createClient(
  db: PrismaClient,
  session: SessionUser,
  input: { name: string; phone?: string }
) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER'])
  return new ClientRepository(db, session.tenantId!).create(input)
}
