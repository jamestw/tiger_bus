import { describe, it, expect } from 'vitest'
import { requireRole, ForbiddenError, type SessionUser } from '@/lib/rbac'

const dispatcher: SessionUser = { id: 'u1', role: 'DISPATCHER', tenantId: 't1' }
const accountant: SessionUser = { id: 'u2', role: 'ACCOUNTANT', tenantId: 't1' }
const superadmin: SessionUser = { id: 'u3', role: 'SUPERADMIN', tenantId: null }

describe('requireRole', () => {
  it('allows a user whose role is in the allowed list', () => {
    expect(() => requireRole(dispatcher, ['DISPATCHER', 'TENANT_ADMIN'])).not.toThrow()
  })

  it('throws ForbiddenError for a user whose role is not allowed', () => {
    expect(() => requireRole(accountant, ['DISPATCHER', 'TENANT_ADMIN'])).toThrow(ForbiddenError)
  })

  it('always allows SUPERADMIN regardless of the allowed list', () => {
    expect(() => requireRole(superadmin, ['ACCOUNTANT'])).not.toThrow()
  })
})
