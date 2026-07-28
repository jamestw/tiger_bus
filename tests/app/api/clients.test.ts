import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { listClients, createClient, updateClient, deleteClient } from '@/app/api/clients/handlers'

describe('clients API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it("creates and lists clients for the caller's tenant", async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const dispatcherSession = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }
    const accountantSession = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    await createClient(testDb, dispatcherSession, { name: '長榮旅行社' })
    const clients = await listClients(testDb, accountantSession)

    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe('長榮旅行社')
  })

  it('rejects client creation from an ACCOUNTANT-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }

    await expect(createClient(testDb, session, { name: '長榮旅行社' })).rejects.toThrow()
  })

  it('updates a client as DISPATCHER', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const dispatcherSession = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }
    const client = await createClient(testDb, dispatcherSession, { name: '長榮旅行社' })

    const updated = await updateClient(testDb, dispatcherSession, client.id, { name: '長榮旅行社改名' })

    expect(updated.name).toBe('長榮旅行社改名')
  })

  it('rejects client update from an ACCOUNTANT-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const dispatcherSession = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }
    const accountantSession = { id: 'u2', role: 'ACCOUNTANT' as const, tenantId: tenant.id }
    const client = await createClient(testDb, dispatcherSession, { name: '長榮旅行社' })

    await expect(
      updateClient(testDb, accountantSession, client.id, { name: 'hacked' })
    ).rejects.toThrow()
  })

  it('soft-deletes a client as DISPATCHER and removes it from the active list', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const dispatcherSession = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }
    const client = await createClient(testDb, dispatcherSession, { name: '長榮旅行社' })

    await deleteClient(testDb, dispatcherSession, client.id)
    const clients = await listClients(testDb, dispatcherSession)

    expect(clients).toHaveLength(0)
  })
})
