import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { listDrivers, createDriver } from '@/app/api/drivers/handlers'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'

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
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))

  return (
    <div>
      <h1>司機管理</h1>

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
                {canManage && <th>變更預設車輛</th>}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.phone ?? '—'}</td>
                  <td>
                    {d.defaultVehicleId
                      ? `${vehicleById.get(d.defaultVehicleId)?.plateNumber ?? '—'}（${vehicleById.get(d.defaultVehicleId)?.type ?? ''}）`
                      : '未綁定'}
                  </td>
                  {canManage && (
                    <td>
                      <form action={setDefaultVehicleAction} className="row-form">
                        <input type="hidden" name="driverId" value={d.id} />
                        <select name="vehicleId" required defaultValue="">
                          <option value="" disabled>
                            選擇車輛
                          </option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.plateNumber}（{v.type}）
                            </option>
                          ))}
                        </select>
                        <button className="btn" type="submit">
                          套用
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
    </div>
  )
}
