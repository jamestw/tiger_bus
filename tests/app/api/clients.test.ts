import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { listClients, createClient } from '@/app/api/clients/handlers'

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
})
