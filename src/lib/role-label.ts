import type { Role } from './rbac'

export const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: 'Superadmin',
  TENANT_ADMIN: '車行管理者',
  DISPATCHER: '調度接單',
  ACCOUNTANT: '會計',
  DRIVER: '司機',
}
