import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { listTenantsHandler, createTenantHandler } from '@/app/api/tenants/handlers'

describe('tenants API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a tenant as SUPERADMIN and lists it', async () => {
    const superadminSession = { id: 'u1', role: 'SUPERADMIN' as const, tenantId: null }

    await createTenantHandler(testDb, superadminSession, {
      tenantName: '新測試車行',
      adminName: '車行負責人',
      adminEmail: 'owner@new-fleet.dev',
      adminPassword: 'password123',
    })
    const tenants = await listTenantsHandler(testDb, superadminSession)

    expect(tenants).toHaveLength(1)
    expect(tenants[0].name).toBe('新測試車行')
  })

  it('rejects tenant creation from a TENANT_ADMIN-role session', async () => {
    const session = { id: 'u2', role: 'TENANT_ADMIN' as const, tenantId: 't1' }

    await expect(
      createTenantHandler(testDb, session, {
        tenantName: '新測試車行',
        adminName: '車行負責人',
        adminEmail: 'owner@new-fleet.dev',
        adminPassword: 'password123',
      })
    ).rejects.toThrow()
  })

  it('rejects listing tenants from a non-SUPERADMIN session', async () => {
    const session = { id: 'u2', role: 'TENANT_ADMIN' as const, tenantId: 't1' }

    await expect(listTenantsHandler(testDb, session)).rejects.toThrow()
  })
})
