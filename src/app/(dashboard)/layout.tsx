import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { Role } from '@/lib/rbac'

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
        <div className="app-sidebar__brand">Tiger Bus 調度系統</div>
        <div className="app-sidebar__user">
          {session.user.name}
          <br />
          {session.user.role}
        </div>
        <nav>
          {visibleItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  )
}
