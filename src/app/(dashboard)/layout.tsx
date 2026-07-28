import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { Role } from '@/lib/rbac'
import { NavLinks } from './nav-links'

const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: 'Superadmin',
  TENANT_ADMIN: '車行管理者',
  DISPATCHER: '調度接單',
  ACCOUNTANT: '會計',
  DRIVER: '司機',
}

const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: '/overview', label: '儀表板總覽', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'] },
  { href: '/calendar', label: '行事曆', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'] },
  { href: '/trips', label: '行程管理', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'] },
  { href: '/drivers', label: '司機管理', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
  { href: '/vehicles', label: '車輛管理', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
  { href: '/clients', label: '客戶管理', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'] },
  { href: '/settlements', label: '結算管理', roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ACCOUNTANT', 'DRIVER'] },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(session.user.role))

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          Tiger Bus
          <span>調度管理系統</span>
        </div>
        <div className="app-sidebar__user">
          <strong>{session.user.name}</strong>
          {ROLE_LABEL[session.user.role]}
        </div>
        <NavLinks items={visibleItems} />
      </aside>
      <div className="app-content">{children}</div>
    </div>
  )
}
