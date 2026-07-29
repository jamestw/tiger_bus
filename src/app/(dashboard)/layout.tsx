import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import type { Role } from '@/lib/rbac'
import { ROLE_LABEL } from '@/lib/role-label'
import { SidebarShell } from './sidebar-shell'

async function signOutAction() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

// Calendar/trips/drivers/vehicles/clients/settlements are all scoped to the
// caller's own tenant. SUPERADMIN has no tenant, so those pages render blank
// for it — deliberately left out of its nav here rather than linking to a
// dead end. Its own scope is cross-tenant: platform overview + tenant admin.
const NAV_GROUPS: { label?: string; items: { href: string; label: string; roles: Role[] }[] }[] = [
  {
    items: [
      { href: '/overview', label: '儀表板總覽', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'] },
      { href: '/tenants', label: '車行管理', roles: ['SUPERADMIN'] },
    ],
  },
  {
    label: '營運',
    items: [
      { href: '/calendar', label: '行事曆', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'] },
      { href: '/trips', label: '行程管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'] },
    ],
  },
  {
    label: '資源',
    items: [
      { href: '/drivers', label: '司機管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
      { href: '/vehicles', label: '車輛管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
      { href: '/clients', label: '客戶管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
    ],
  },
  {
    label: '財務',
    items: [{ href: '/settlements', label: '結算管理', roles: ['TENANT_ADMIN', 'ACCOUNTANT', 'DRIVER'] }],
  },
  {
    label: '設定',
    items: [
      { href: '/users', label: '使用者管理', roles: ['TENANT_ADMIN'] },
      { href: '/settings', label: '車行設定', roles: ['TENANT_ADMIN'] },
    ],
  },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const visibleGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.roles.includes(session.user.role)),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="app-shell">
      <SidebarShell
        userName={session.user.name}
        roleLabel={ROLE_LABEL[session.user.role]}
        navGroups={visibleGroups}
        signOutAction={signOutAction}
      />
      <div className="app-content">{children}</div>
    </div>
  )
}
