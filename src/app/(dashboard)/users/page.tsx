import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { listUsers, createUser } from '@/app/api/users/handlers'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { ROLE_LABEL } from '@/lib/role-label'
import type { TenantRole } from '@/lib/repositories/user-repository'
import { CreateUserForm } from './create-user-form'

async function createUserAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  const role = formData.get('role') as TenantRole
  const driverId = formData.get('driverId') as string
  await createUser(db, session.user, {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    role,
    driverId: role === 'DRIVER' && driverId ? driverId : undefined,
  })
  revalidatePath('/users')
  revalidatePath('/drivers')
}

export default async function UsersPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId || user.role !== 'TENANT_ADMIN') {
    return (
      <div>
        <h1>使用者管理</h1>
        <div className="empty-state">只有車行管理者能管理使用者帳號</div>
      </div>
    )
  }

  const users = await listUsers(db, user)
  const allDrivers = await new DriverRepository(db, user.tenantId).list()
  const unlinkedDrivers = allDrivers.filter((d) => !d.userId).map((d) => ({ id: d.id, name: d.name }))

  return (
    <div>
      <h1>使用者管理</h1>

      <div className="app-section">
        <h2>新增使用者</h2>
        <CreateUserForm unlinkedDrivers={unlinkedDrivers} createUserAction={createUserAction} />
      </div>

      <div className="app-section">
        <h2>使用者清單</h2>
        {users.length === 0 ? (
          <div className="empty-state">還沒有任何使用者</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>Email</th>
                <th>角色</th>
                <th>綁定司機</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.driver?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
