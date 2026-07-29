import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  listTenantsHandler,
  createTenantHandler,
  updateTenantHandler,
  setTenantStatusHandler,
} from '@/app/api/tenants/handlers'
import { TenantRow } from './tenant-row'
import type { TenantStatus } from '@prisma/client'

async function createTenantAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await createTenantHandler(db, session.user, {
    tenantName: formData.get('tenantName') as string,
    adminName: formData.get('adminName') as string,
    adminEmail: formData.get('adminEmail') as string,
    adminPassword: formData.get('adminPassword') as string,
  })
  revalidatePath('/tenants')
}

async function updateTenantAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await updateTenantHandler(db, session.user, {
    tenantId: formData.get('tenantId') as string,
    tenantName: formData.get('tenantName') as string,
    adminName: formData.get('adminName') as string,
  })
  revalidatePath('/tenants')
}

async function setTenantStatusAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await setTenantStatusHandler(db, session.user, {
    tenantId: formData.get('tenantId') as string,
    status: formData.get('status') as TenantStatus,
  })
  revalidatePath('/tenants')
}

export default async function TenantsPage() {
  const session = await auth()
  const user = session?.user
  if (!user || user.role !== 'SUPERADMIN') {
    return (
      <div>
        <h1>車行管理</h1>
        <div className="empty-state">只有 Superadmin 能管理車行</div>
      </div>
    )
  }

  const tenants = await listTenantsHandler(db, user)

  return (
    <div>
      <h1>車行管理</h1>

      <div className="app-section">
        <h2>車行清單</h2>
        {tenants.length === 0 ? (
          <div className="empty-state">還沒有任何車行</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>車行名稱</th>
                <th>管理者姓名</th>
                <th>狀態</th>
                <th>建立日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <TenantRow
                  key={t.id}
                  tenant={t}
                  updateAction={updateTenantAction}
                  setStatusAction={setTenantStatusAction}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="app-section">
        <h2>新增車行</h2>
        <form action={createTenantAction} className="inline-form">
          <div className="field">
            <label>車行名稱</label>
            <input name="tenantName" required />
          </div>
          <div className="field">
            <label>管理者姓名</label>
            <input name="adminName" required />
          </div>
          <div className="field">
            <label>管理者 Email（登入帳號）</label>
            <input name="adminEmail" type="email" required />
          </div>
          <div className="field">
            <label>登入密碼</label>
            <input name="adminPassword" type="password" required minLength={8} />
          </div>
          <button className="btn" type="submit">
            建立車行
          </button>
        </form>
      </div>
    </div>
  )
}
