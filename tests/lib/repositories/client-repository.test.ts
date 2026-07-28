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
})
