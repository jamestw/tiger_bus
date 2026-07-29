import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { listUsers, createUser } from '@/app/api/users/handlers'

describe('users API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates and lists a user as TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }

    await createUser(testDb, session, {
      name: '調度小美', email: 'dispatcher-h@test.com', password: 'password123', role: 'DISPATCHER',
    })
    const users = await listUsers(testDb, session)

    expect(users).toHaveLength(1)
    expect(users[0].name).toBe('調度小美')
    expect(users[0].role).toBe('DISPATCHER')
  })

  it('creates a DRIVER user linked to a driver record', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const session = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }

    const user = await createUser(testDb, session, {
      name: '志偉', email: 'driver-h@test.com', password: 'password123', role: 'DRIVER', driverId: driver.id,
    })

    expect(user.role).toBe('DRIVER')
    const linkedDriver = await testDb.driver.findUnique({ where: { id: driver.id } })
    expect(linkedDriver?.userId).toBe(user.id)
  })

  it('rejects user creation from a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(
      createUser(testDb, session, {
        name: '調度小美', email: 'dispatcher-h2@test.com', password: 'password123', role: 'DISPATCHER',
      })
    ).rejects.toThrow()
  })

  it('rejects listing users from a non-TENANT_ADMIN session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    await expect(listUsers(testDb, session)).rejects.toThrow()
  })
})
