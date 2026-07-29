import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/app/api/vehicles/handlers'
import { VehicleRow } from './vehicle-row'

async function createVehicleAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  const lastInspectionDate = formData.get('lastInspectionDate') as string
  await createVehicle(db, session.user, {
    type: formData.get('type') as string,
    plateNumber: formData.get('plateNumber') as string,
    capacity: Number(formData.get('capacity')),
    lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : undefined,
  })
  revalidatePath('/vehicles')
}

async function updateVehicleAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  const lastInspectionDate = formData.get('lastInspectionDate') as string
  await updateVehicle(db, session.user, formData.get('vehicleId') as string, {
    type: formData.get('type') as string,
    plateNumber: formData.get('plateNumber') as string,
    capacity: Number(formData.get('capacity')),
    lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : undefined,
  })
  revalidatePath('/vehicles')
}

async function deleteVehicleAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await deleteVehicle(db, session.user, formData.get('vehicleId') as string)
  revalidatePath('/vehicles')
}

export default async function VehiclesPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId) return null
  const canManage = user.role === 'TENANT_ADMIN' || user.role === 'SUPERADMIN'

  const vehicles = await listVehicles(db, user)

  return (
    <div>
      <h1>車輛管理</h1>

      {canManage && (
        <div className="app-section">
          <h2>新增車輛</h2>
          <form action={createVehicleAction} className="inline-form">
            <div className="field">
              <label>種類</label>
              <input name="type" placeholder="大巴 / 中巴" required />
            </div>
            <div className="field">
              <label>車號</label>
              <input name="plateNumber" required />
            </div>
            <div className="field">
              <label>乘客數</label>
              <input name="capacity" type="number" min="1" required />
            </div>
            <div className="field">
              <label>最後檢驗日期</label>
              <input name="lastInspectionDate" type="date" />
            </div>
            <button className="btn" type="submit">
              新增車輛
            </button>
          </form>
        </div>
      )}

      <div className="app-section">
        <h2>車輛清單</h2>
        {vehicles.length === 0 ? (
          <div className="empty-state">還沒有任何車輛</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>車號</th>
                <th>種類</th>
                <th>乘客數</th>
                <th>最後檢驗日期</th>
                {canManage && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <VehicleRow
                  key={v.id}
                  vehicle={v}
                  canManage={canManage}
                  updateAction={updateVehicleAction}
                  deleteAction={deleteVehicleAction}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
