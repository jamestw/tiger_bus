import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { TenantRepository } from '@/lib/repositories/tenant-repository'

describe('TenantRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it("gets the repository's own tenant profile", async () => {
    const tenant = await testDb.tenant.create({ data: { name: '測試車行' } })
    const repo = new TenantRepository(testDb, tenant.id)

    const profile = await repo.get()

    expect(profile.name).toBe('測試車行')
    expect(profile.contactName).toBeNull()
    expect(profile.defaultCalendarView).toBe('MONTH')
  })

  it('updates the tenant profile (name, contact name, contact phone, default calendar view)', async () => {
    const tenant = await testDb.tenant.create({ data: { name: '測試車行' } })
    const repo = new TenantRepository(testDb, tenant.id)

    const updated = await repo.update({
      name: '測試車行（更新）',
      contactName: '陳老闆',
      contactPhone: '02-1111-2222',
      defaultCalendarView: 'WEEK',
    })

    expect(updated.name).toBe('測試車行（更新）')
    expect(updated.contactName).toBe('陳老闆')
    expect(updated.contactPhone).toBe('02-1111-2222')
    expect(updated.defaultCalendarView).toBe('WEEK')
  })

  it('cannot update another tenant through a different id', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'A車行' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'B車行' } })
    const repo = new TenantRepository(testDb, tenantA.id)

    await repo.update({ name: 'A改名', contactName: null, contactPhone: null, defaultCalendarView: 'MONTH' })
    const untouchedB = await testDb.tenant.findUnique({ where: { id: tenantB.id } })

    expect(untouchedB?.name).toBe('B車行')
  })
})
