import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { ClientRepository } from '@/lib/repositories/client-repository'

describe('ClientRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates and lists clients scoped to a tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new ClientRepository(testDb, tenant.id)

    await repo.create({ name: '長榮旅行社', phone: '02-1234-5678' })
    const clients = await repo.list()

    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe('長榮旅行社')
  })

  it('does not leak clients across tenants', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    await new ClientRepository(testDb, tenantB.id).create({ name: 'B-client' })

    const clientsForA = await new ClientRepository(testDb, tenantA.id).list()

    expect(clientsForA).toHaveLength(0)
  })

  it('updates a client scoped to its own tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new ClientRepository(testDb, tenant.id)
    const client = await repo.create({ name: '長榮旅行社' })

    const updated = await repo.update(client.id, { name: '長榮旅行社改名', phone: '02-0000-0000' })

    expect(updated.name).toBe('長榮旅行社改名')
    expect(updated.phone).toBe('02-0000-0000')
  })

  it('rejects updating a client from another tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const clientB = await new ClientRepository(testDb, tenantB.id).create({ name: 'B-client' })

    await expect(
      new ClientRepository(testDb, tenantA.id).update(clientB.id, { name: 'hacked' })
    ).rejects.toThrow()
  })

  it('soft-deletes a client and excludes it from list()', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new ClientRepository(testDb, tenant.id)
    const client = await repo.create({ name: '長榮旅行社' })

    await repo.softDelete(client.id)
    const clients = await repo.list()

    expect(clients).toHaveLength(0)
  })

  it('still includes soft-deleted clients in listAll()', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new ClientRepository(testDb, tenant.id)
    const client = await repo.create({ name: '長榮旅行社' })
    await repo.softDelete(client.id)

    const all = await repo.listAll()

    expect(all).toHaveLength(1)
    expect(all[0].deletedAt).not.toBeNull()
  })
})
