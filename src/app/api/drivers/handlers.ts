import type { PrismaClient } from '@prisma/client'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listDrivers(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'])
  return new DriverRepository(db, session.tenantId!).list()
}

export async function createDriver(
  db: PrismaClient,
  session: SessionUser,
  input: { name: string; phone?: string }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new DriverRepository(db, session.tenantId!).create(input)
}

export async function updateDriver(
  db: PrismaClient,
  session: SessionUser,
  driverId: string,
  input: { name: string; phone?: string }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new DriverRepository(db, session.tenantId!).update(driverId, input)
}

export async function deleteDriver(db: PrismaClient, session: SessionUser, driverId: string) {
  requireRole(session, ['TENANT_ADMIN'])
  return new DriverRepository(db, session.tenantId!).softDelete(driverId)
}
