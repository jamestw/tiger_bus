import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { listDrivers, createDriver, updateDriver, deleteDriver } from '@/app/api/drivers/handlers'

describe('drivers API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it("creates and lists drivers for the caller's tenant", async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const dispatcherSession = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await createDriver(testDb, adminSession, { name: '志偉', phone: '0912345678' })
    const drivers = await listDrivers(testDb, dispatcherSession)

    expect(drivers).toHaveLength(1)
    expect(drivers[0].name).toBe('志偉')
  })

  it('rejects driver creation from a DRIVER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u2', role: 'DRIVER' as const, tenantId: tenant.id }

    await expect(
      createDriver(testDb, session, { name: '志偉' })
    ).rejects.toThrow()
  })

  it('updates a driver as TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const driver = await createDriver(testDb, adminSession, { name: '志偉' })

    const updated = await updateDriver(testDb, adminSession, driver.id, { name: '志偉改名' })

    expect(updated.name).toBe('志偉改名')
  })

  it('rejects driver update from a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const dispatcherSession = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }
    const driver = await createDriver(testDb, adminSession, { name: '志偉' })

    await expect(
      updateDriver(testDb, dispatcherSession, driver.id, { name: 'hacked' })
    ).rejects.toThrow()
  })

  it('soft-deletes a driver as TENANT_ADMIN and removes it from the active list', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const driver = await createDriver(testDb, adminSession, { name: '志偉' })

    await deleteDriver(testDb, adminSession, driver.id)
    const drivers = await listDrivers(testDb, adminSession)

    expect(drivers).toHaveLength(0)
  })
})
