import type { PrismaClient } from '@prisma/client'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listVehicles(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'])
  return new VehicleRepository(db, session.tenantId!).list()
}

export async function createVehicle(
  db: PrismaClient,
  session: SessionUser,
  input: { type: string; plateNumber: string; capacity: number; lastInspectionDate?: Date }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new VehicleRepository(db, session.tenantId!).create(input)
}

export async function updateVehicle(
  db: PrismaClient,
  session: SessionUser,
  vehicleId: string,
  input: { type: string; plateNumber: string; capacity: number; lastInspectionDate?: Date }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new VehicleRepository(db, session.tenantId!).update(vehicleId, input)
}

export async function deleteVehicle(db: PrismaClient, session: SessionUser, vehicleId: string) {
  requireRole(session, ['TENANT_ADMIN'])
  return new VehicleRepository(db, session.tenantId!).softDelete(vehicleId)
}
