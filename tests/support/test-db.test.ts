import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from './test-db'

describe('test database', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('starts empty and can create a tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Test Co' } })
    expect(tenant.name).toBe('Test Co')

    const count = await testDb.tenant.count()
    expect(count).toBe(1)
  })
})
