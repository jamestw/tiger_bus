import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { UserRepository } from '@/lib/repositories/user-repository'
import { verifyPassword } from '@/lib/password'

describe('UserRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a user scoped to the tenant, with a hashed password', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new UserRepository(testDb, tenant.id)

    const user = await repo.create({
      name: '調度小美', email: 'dispatcher-new@test.com', password: 'password123', role: 'DISPATCHER',
    })

    expect(user.tenantId).toBe(tenant.id)
    expect(user.role).toBe('DISPATCHER')
    expect(user.passwordHash).not.toBe('password123')
    expect(await verifyPassword('password123', user.passwordHash)).toBe(true)
  })

  it('creates a DRIVER user and links it to an existing driver record', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new UserRepository(testDb, tenant.id)

    const user = await repo.create({
      name: '志偉', email: 'driver-new@test.com', password: 'password123', role: 'DRIVER', driverId: driver.id,
    })

    const linkedDriver = await testDb.driver.findUnique({ where: { id: driver.id } })
    expect(linkedDriver?.userId).toBe(user.id)
  })

  it('rejects linking a driver that already has a login account', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new UserRepository(testDb, tenant.id)
    await repo.create({
      name: '志偉', email: 'driver-a@test.com', password: 'password123', role: 'DRIVER', driverId: driver.id,
    })

    await expect(
      repo.create({
        name: '志偉2', email: 'driver-b@test.com', password: 'password123', role: 'DRIVER', driverId: driver.id,
      })
    ).rejects.toThrow(/already/)
  })

  it('rejects linking a driver from a different tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B司機' })
    const repoA = new UserRepository(testDb, tenantA.id)

    await expect(
      repoA.create({
        name: 'B司機', email: 'cross-tenant@test.com', password: 'password123', role: 'DRIVER', driverId: driverB.id,
      })
    ).rejects.toThrow()
  })

  it('lists users scoped to the tenant, including their linked driver', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driver = await new DriverRepository(testDb, tenantA.id).create({ name: '志偉' })
    const repoA = new UserRepository(testDb, tenantA.id)
    await repoA.create({
      name: '志偉', email: 'driver-list@test.com', password: 'password123', role: 'DRIVER', driverId: driver.id,
    })
    await new UserRepository(testDb, tenantB.id).create({
      name: 'B調度', email: 'other-tenant@test.com', password: 'password123', role: 'DISPATCHER',
    })

    const users = await repoA.list()

    expect(users).toHaveLength(1)
    expect(users[0].name).toBe('志偉')
    expect(users[0].driver?.id).toBe(driver.id)
  })
})
