import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/app/api/vehicles/handlers'

describe('vehicles API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it("creates and lists vehicles for the caller's tenant", async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const accountantSession = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    await createVehicle(testDb, adminSession, { type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })
    const vehicles = await listVehicles(testDb, accountantSession)

    expect(vehicles).toHaveLength(1)
    expect(vehicles[0].plateNumber).toBe('KKA-9217')
  })

  it('rejects vehicle creation from a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(
      createVehicle(testDb, session, { type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })
    ).rejects.toThrow()
  })

  it('updates a vehicle as TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const vehicle = await createVehicle(testDb, adminSession, { type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })

    const updated = await updateVehicle(testDb, adminSession, vehicle.id, {
      type: '中巴', plateNumber: 'KKA-9217', capacity: 30,
    })

    expect(updated.type).toBe('中巴')
    expect(updated.capacity).toBe(30)
  })

  it('soft-deletes a vehicle as TENANT_ADMIN and removes it from the active list', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const vehicle = await createVehicle(testDb, adminSession, { type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })

    await deleteVehicle(testDb, adminSession, vehicle.id)
    const vehicles = await listVehicles(testDb, adminSession)

    expect(vehicles).toHaveLength(0)
  })
})
