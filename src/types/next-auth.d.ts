import type { Role } from '@/lib/rbac'

declare module 'next-auth' {
  interface User {
    role: Role
    tenantId: string | null
  }

  interface Session {
    user: {
      id: string
      role: Role
      tenantId: string | null
      name: string
      email: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: Role
    tenantId: string | null
  }
}
