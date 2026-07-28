import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div>
      <nav>
        <span>{session.user.name}（{session.user.role}）</span>
        <a href="/calendar">行事曆</a>
        <a href="/settlements">結算</a>
      </nav>
      <main>{children}</main>
    </div>
  )
}
