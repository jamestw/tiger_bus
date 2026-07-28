import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { getTenantProfile, updateTenantProfile } from '@/app/api/tenant-profile/handlers'

describe('tenant-profile API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('gets and updates the profile as TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: '測試車行' } })
    const session = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }

    const before = await getTenantProfile(testDb, session)
    expect(before.name).toBe('測試車行')

    const updated = await updateTenantProfile(testDb, session, {
      name: '測試車行（更新）', contactName: '陳老闆', contactPhone: '02-1111-2222',
    })

    expect(updated.contactName).toBe('陳老闆')
  })

  it('rejects updating the profile from a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: '測試車行' } })
    const session = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(
      updateTenantProfile(testDb, session, { name: 'x', contactName: null, contactPhone: null })
    ).rejects.toThrow()
  })
})
