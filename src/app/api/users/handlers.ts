import type { PrismaClient } from '@prisma/client'
import { UserRepository, type TenantRole } from '@/lib/repositories/user-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listUsers(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN'])
  return new UserRepository(db, session.tenantId!).list()
}

export async function createUser(
  db: PrismaClient,
  session: SessionUser,
  input: { name: string; email: string; password: string; role: TenantRole; driverId?: string }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new UserRepository(db, session.tenantId!).create(input)
}
