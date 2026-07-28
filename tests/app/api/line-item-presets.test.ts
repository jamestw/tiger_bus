import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { listLineItemPresets, createLineItemPreset, deleteLineItemPreset } from '@/app/api/line-item-presets/handlers'

describe('line-item-presets API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a preset as TENANT_ADMIN and lists it for DISPATCHER', async () => {
    const tenant = await testDb.tenant.create({ data: { name: '測試車行' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const dispatcherSession = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await createLineItemPreset(testDb, adminSession, { name: '車資', type: 'REVENUE' })
    const presets = await listLineItemPresets(testDb, dispatcherSession)

    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe('車資')
  })

  it('rejects preset creation from a DISPATCHER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: '測試車行' } })
    const session = { id: 'u2', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await expect(
      createLineItemPreset(testDb, session, { name: '車資', type: 'REVENUE' })
    ).rejects.toThrow()
  })

  it('deletes a preset as TENANT_ADMIN', async () => {
    const tenant = await testDb.tenant.create({ data: { name: '測試車行' } })
    const adminSession = { id: 'u1', role: 'TENANT_ADMIN' as const, tenantId: tenant.id }
    const preset = await createLineItemPreset(testDb, adminSession, { name: '車資', type: 'REVENUE' })

    await deleteLineItemPreset(testDb, adminSession, preset.id)
    const presets = await listLineItemPresets(testDb, adminSession)

    expect(presets).toHaveLength(0)
  })
})
