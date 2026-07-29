import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import {
  listTenantsHandler,
  createTenantHandler,
  updateTenantHandler,
  setTenantStatusHandler,
} from '@/app/api/tenants/handlers'

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

  it('updates a tenant and its admin name as SUPERADMIN', async () => {
    const superadminSession = { id: 'u1', role: 'SUPERADMIN' as const, tenantId: null }
    const { tenant } = await createTenantHandler(testDb, superadminSession, {
      tenantName: '新測試車行', adminName: '車行負責人',
      adminEmail: 'owner2@new-fleet.dev', adminPassword: 'password123',
    })

    const result = await updateTenantHandler(testDb, superadminSession, {
      tenantId: tenant.id, tenantName: '改名車行', adminName: '新負責人',
    })

    expect(result.tenant.name).toBe('改名車行')
    expect(result.adminUser?.name).toBe('新負責人')
  })

  it('rejects updating a tenant from a non-SUPERADMIN session', async () => {
    const session = { id: 'u2', role: 'TENANT_ADMIN' as const, tenantId: 't1' }

    await expect(
      updateTenantHandler(testDb, session, { tenantId: 't1', tenantName: 'x', adminName: 'y' })
    ).rejects.toThrow()
  })

  it('suspends and reactivates a tenant as SUPERADMIN', async () => {
    const superadminSession = { id: 'u1', role: 'SUPERADMIN' as const, tenantId: null }
    const { tenant } = await createTenantHandler(testDb, superadminSession, {
      tenantName: '新測試車行', adminName: '車行負責人',
      adminEmail: 'owner3@new-fleet.dev', adminPassword: 'password123',
    })

    const suspended = await setTenantStatusHandler(testDb, superadminSession, {
      tenantId: tenant.id, status: 'SUSPENDED',
    })
    expect(suspended.status).toBe('SUSPENDED')
  })

  it('rejects changing tenant status from a non-SUPERADMIN session', async () => {
    const session = { id: 'u2', role: 'TENANT_ADMIN' as const, tenantId: 't1' }

    await expect(
      setTenantStatusHandler(testDb, session, { tenantId: 't1', status: 'SUSPENDED' })
    ).rejects.toThrow()
  })
})
