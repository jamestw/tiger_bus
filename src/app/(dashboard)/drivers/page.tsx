import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { listDrivers, createDriver, updateDriver, deleteDriver } from '@/app/api/drivers/handlers'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { DriverRow } from './driver-row'

async function createDriverAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await createDriver(db, session.user, {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  })
  revalidatePath('/drivers')
}

async function updateDriverAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await updateDriver(db, session.user, formData.get('driverId') as string, {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  })
  revalidatePath('/drivers')
}

async function deleteDriverAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await deleteDriver(db, session.user, formData.get('driverId') as string)
  revalidatePath('/drivers')
}

async function setDefaultVehicleAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user?.tenantId) return
  await new DriverRepository(db, session.user.tenantId).setDefaultVehicle(
    formData.get('driverId') as string,
    formData.get('vehicleId') as string
  )
  revalidatePath('/drivers')
}

export default async function DriversPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId) return null
  const canManage = user.role === 'TENANT_ADMIN' || user.role === 'SUPERADMIN'

  const drivers = await listDrivers(db, user)
  const vehicles = await new VehicleRepository(db, user.tenantId).list()

  return (
    <div>
      <h1>司機管理</h1>

      {canManage && (
        <div className="app-section">
          <h2>新增司機</h2>
          <form action={createDriverAction} className="inline-form">
            <div className="field">
              <label>姓名</label>
              <input name="name" required />
            </div>
            <div className="field">
              <label>電話</label>
              <input name="phone" />
            </div>
            <button className="btn" type="submit">
              新增司機
            </button>
          </form>
        </div>
      )}

      <div className="app-section">
        <h2>司機清單</h2>
        {drivers.length === 0 ? (
          <div className="empty-state">還沒有任何司機</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>電話</th>
                <th>預設車輛</th>
                {canManage && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <DriverRow
                  key={d.id}
                  driver={d}
                  vehicles={vehicles}
                  canManage={canManage}
                  updateAction={updateDriverAction}
                  deleteAction={deleteDriverAction}
                  setDefaultVehicleAction={setDefaultVehicleAction}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
