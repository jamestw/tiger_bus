import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import type { Role } from '@/lib/rbac'
import { SidebarShell } from './sidebar-shell'

async function signOutAction() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: 'Superadmin',
  TENANT_ADMIN: '車行管理者',
  DISPATCHER: '調度接單',
  ACCOUNTANT: '會計',
  DRIVER: '司機',
}

// Calendar/trips/drivers/vehicles/clients/settlements are all scoped to the
// caller's own tenant. SUPERADMIN has no tenant, so those pages render blank
// for it — deliberately left out of its nav here rather than linking to a
// dead end. Its own scope is cross-tenant: platform overview + tenant admin.
const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: '/overview', label: '儀表板總覽', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'] },
  { href: '/tenants', label: '車行管理', roles: ['SUPERADMIN'] },
  { href: '/calendar', label: '行事曆', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'] },
  { href: '/trips', label: '行程管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'] },
  { href: '/drivers', label: '司機管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
  { href: '/vehicles', label: '車輛管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
  { href: '/clients', label: '客戶管理', roles: ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
  { href: '/settlements', label: '結算管理', roles: ['TENANT_ADMIN', 'ACCOUNTANT', 'DRIVER'] },
  { href: '/settings', label: '車行設定', roles: ['TENANT_ADMIN'] },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(session.user.role))

  return (
    <div className="app-shell">
      <SidebarShell
        userName={session.user.name}
        roleLabel={ROLE_LABEL[session.user.role]}
        navItems={visibleItems}
        signOutAction={signOutAction}
      />
      <div className="app-content">{children}</div>
    </div>
  )
}
