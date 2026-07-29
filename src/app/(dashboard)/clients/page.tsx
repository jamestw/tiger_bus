import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { listClients, createClient, updateClient, deleteClient } from '@/app/api/clients/handlers'
import { ClientRow } from './client-row'

async function createClientAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await createClient(db, session.user, {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  })
  revalidatePath('/clients')
}

async function updateClientAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await updateClient(db, session.user, formData.get('clientId') as string, {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  })
  revalidatePath('/clients')
}

async function deleteClientAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await deleteClient(db, session.user, formData.get('clientId') as string)
  revalidatePath('/clients')
}

export default async function ClientsPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId) return null
  const canManage = ['TENANT_ADMIN', 'DISPATCHER', 'SUPERADMIN'].includes(user.role)

  const clients = await listClients(db, user)

  return (
    <div>
      <h1>客戶管理</h1>

      {canManage && (
        <div className="app-section">
          <h2>新增客戶</h2>
          <form action={createClientAction} className="inline-form">
            <div className="field">
              <label>名稱</label>
              <input name="name" required />
            </div>
            <div className="field">
              <label>聯絡電話</label>
              <input name="phone" />
            </div>
            <button className="btn" type="submit">
              新增客戶
            </button>
          </form>
        </div>
      )}

      <div className="app-section">
        <h2>客戶清單</h2>
        {clients.length === 0 ? (
          <div className="empty-state">還沒有任何客戶</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>名稱</th>
                <th>聯絡電話</th>
                {canManage && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  canManage={canManage}
                  updateAction={updateClientAction}
                  deleteAction={deleteClientAction}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
