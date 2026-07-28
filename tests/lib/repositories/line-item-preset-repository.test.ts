import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { LineItemPresetRepository } from '@/lib/repositories/line-item-preset-repository'

describe('LineItemPresetRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates and lists presets scoped to a tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new LineItemPresetRepository(testDb, tenant.id)

    await repo.create({ name: '車資', type: 'REVENUE' })
    await repo.create({ name: '油資', type: 'COST' })
    const presets = await repo.list()

    expect(presets).toHaveLength(2)
    expect(presets.map((p) => p.name)).toEqual(expect.arrayContaining(['車資', '油資']))
  })

  it('does not leak presets across tenants', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    await new LineItemPresetRepository(testDb, tenantB.id).create({ name: '過路費', type: 'COST' })

    const presetsForA = await new LineItemPresetRepository(testDb, tenantA.id).list()

    expect(presetsForA).toHaveLength(0)
  })

  it('rejects a duplicate name+type within the same tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new LineItemPresetRepository(testDb, tenant.id)
    await repo.create({ name: '車資', type: 'REVENUE' })

    await expect(repo.create({ name: '車資', type: 'REVENUE' })).rejects.toThrow()
  })

  it('deletes a preset scoped to its own tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new LineItemPresetRepository(testDb, tenant.id)
    const preset = await repo.create({ name: '車資', type: 'REVENUE' })

    await repo.delete(preset.id)
    const presets = await repo.list()

    expect(presets).toHaveLength(0)
  })

  it('rejects deleting a preset from another tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const presetB = await new LineItemPresetRepository(testDb, tenantB.id).create({
      name: '過路費', type: 'COST',
    })

    await expect(new LineItemPresetRepository(testDb, tenantA.id).delete(presetB.id)).rejects.toThrow()
  })
})
