export type Role = 'SUPERADMIN' | 'TENANT_ADMIN' | 'DISPATCHER' | 'ACCOUNTANT' | 'DRIVER'

export interface SessionUser {
  id: string
  role: Role
  tenantId: string | null
}

export class ForbiddenError extends Error {
  constructor(role: Role) {
    super(`Role ${role} is not permitted to perform this action`)
    this.name = 'ForbiddenError'
  }
}

export function requireRole(user: SessionUser, allowed: Role[]): void {
  if (user.role === 'SUPERADMIN') return
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(user.role)
  }
}
