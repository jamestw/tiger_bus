import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createTrip, listTripsInRange } from '@/app/api/trips/handlers'
import { createClient } from '@/app/api/clients/handlers'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'
import { STATUS_LABEL } from '@/lib/trip-status-label'
import { ClientCombobox } from './client-combobox'

async function createTripAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await createTrip(db, session.user, {
    startDate: new Date(formData.get('startDate') as string),
    endDate: new Date((formData.get('endDate') as string) || (formData.get('startDate') as string)),
    routeDescription: formData.get('routeDescription') as string,
    passengerCount: Number(formData.get('passengerCount')),
    clientId: formData.get('clientId') as string,
    driverId: formData.get('driverId') as string,
  })
  revalidatePath('/trips')
  revalidatePath('/calendar')
}

async function quickCreateClientAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const client = await createClient(db, session.user, {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  })
  revalidatePath('/trips')
  revalidatePath('/clients')
  return { id: client.id, name: client.name, phone: client.phone }
}

export default async function TripsPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId) return null
  const canManage = ['TENANT_ADMIN', 'DISPATCHER', 'SUPERADMIN'].includes(user.role)
  const canSeeFinancials = ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'SUPERADMIN'].includes(user.role)

  const rangeStart = new Date()
  rangeStart.setDate(1)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  rangeEnd.setDate(0)

  const trips = await listTripsInRange(db, user, rangeStart, rangeEnd)
  const clientRepo = new ClientRepository(db, user.tenantId)
  const driverRepo = new DriverRepository(db, user.tenantId)
  const clients = await clientRepo.list()
  const drivers = await driverRepo.list()
  // Historical trips may reference a since-deleted client/driver — look those
  // names up from listAll() so past records don't lose their label.
  const clientById = new Map((await clientRepo.listAll()).map((c) => [c.id, c]))
  const driverById = new Map((await driverRepo.listAll()).map((d) => [d.id, d]))

  const lineItemRepo = new TripLineItemRepository(db, user.tenantId)
  const lineItemsByTrip = new Map(
    await Promise.all(trips.map(async (t) => [t.id, await lineItemRepo.listForTrip(t.id)] as const))
  )

  return (
    <div>
      <h1>行程管理</h1>

      {canManage && (
        <div className="app-section">
          <h2>建立行程並指派司機</h2>
          <form action={createTripAction} className="inline-form">
            <div className="field">
              <label>開始日期</label>
              <input name="startDate" type="date" required />
            </div>
            <div className="field">
              <label>結束日期（跨天才需填）</label>
              <input name="endDate" type="date" />
            </div>
            <div className="field">
              <label>路線</label>
              <input name="routeDescription" placeholder="台北一日" required />
            </div>
            <div className="field">
              <label>人數</label>
              <input name="passengerCount" type="number" min="1" required />
            </div>
            <ClientCombobox
              clients={clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
              quickCreateClientAction={quickCreateClientAction}
            />
            <div className="field">
              <label>指派司機</label>
              <select name="driverId" required defaultValue="">
                <option value="" disabled>
                  選擇司機
                </option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id} disabled={!d.defaultVehicleId}>
                    {d.name}
                    {!d.defaultVehicleId && '（尚未綁定車輛）'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit">
              建立行程
            </button>
          </form>
        </div>
      )}

      <div className="app-section">
        <h2>本月行程</h2>
        {trips.length === 0 ? (
          <div className="empty-state">本月還沒有任何行程</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>路線</th>
                <th>客戶</th>
                <th>司機</th>
                <th>人數</th>
                <th>狀態</th>
                {canSeeFinancials && <th>總金額</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => {
                const lineItems = lineItemsByTrip.get(t.id) ?? []
                const revenue = lineItems.filter((li) => li.type === 'REVENUE').reduce((s, li) => s + Number(li.amount), 0)
                const cost = lineItems.filter((li) => li.type === 'COST').reduce((s, li) => s + Number(li.amount), 0)
                return (
                  <tr key={t.id}>
                    <td>
                      {t.startDate.toLocaleDateString('zh-TW')}
                      {t.startDate.getTime() !== t.endDate.getTime() &&
                        ` ～ ${t.endDate.toLocaleDateString('zh-TW')}`}
                    </td>
                    <td>{t.routeDescription}</td>
                    <td>{clientById.get(t.clientId)?.name ?? '—'}</td>
                    <td>{driverById.get(t.driverId)?.name ?? '—'}</td>
                    <td>{t.passengerCount}</td>
                    <td>{STATUS_LABEL[t.status]}</td>
                    {canSeeFinancials && (
                      <td>{lineItems.length === 0 ? '—' : (revenue - cost).toLocaleString()}</td>
                    )}
                    <td>
                      <a className="btn" href={`/trips/${t.id}`}>
                        編輯
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
