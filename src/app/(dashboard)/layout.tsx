import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div>
      <nav className="app-nav">
        <span className="app-nav__user">{session.user.name}（{session.user.role}）</span>
        <a href="/calendar">行事曆</a>
        <a href="/settlements">結算</a>
      </nav>
      <main className="app-main">{children}</main>
    </div>
  )
}
