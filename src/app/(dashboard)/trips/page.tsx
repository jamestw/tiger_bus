import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createTrip, listTripsInRange } from '@/app/api/trips/handlers'
import { addTripLineItem } from '@/app/api/trips/[tripId]/line-items/handlers'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'
import { TripRepository, TRIP_STATUS_TRANSITIONS } from '@/lib/repositories/trip-repository'
import { requireRole } from '@/lib/rbac'
import type { TripStatus } from '@prisma/client'

const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: '待確認',
  CONFIRMED: '已確認',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

async function addLineItemAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await addTripLineItem(db, session.user, formData.get('tripId') as string, {
    type: formData.get('type') as 'REVENUE' | 'COST',
    name: formData.get('name') as string,
    amount: Number(formData.get('amount')),
  })
  revalidatePath('/trips')
}

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

async function transitionStatusAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user?.tenantId) return
  requireRole(session.user, ['TENANT_ADMIN', 'DISPATCHER'])
  await new TripRepository(db, session.user.tenantId).transitionStatus(
    formData.get('tripId') as string,
    formData.get('nextStatus') as TripStatus
  )
  revalidatePath('/trips')
  revalidatePath('/calendar')
}

export default async function TripsPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId) return null
  const canManage = ['TENANT_ADMIN', 'DISPATCHER', 'SUPERADMIN'].includes(user.role)

  const rangeStart = new Date()
  rangeStart.setDate(1)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  rangeEnd.setDate(0)

  const trips = await listTripsInRange(db, user, rangeStart, rangeEnd)
  const clients = await new ClientRepository(db, user.tenantId).list()
  const drivers = await new DriverRepository(db, user.tenantId).list()
  const clientById = new Map(clients.map((c) => [c.id, c]))
  const driverById = new Map(drivers.map((d) => [d.id, d]))

  const lineItemRepo = new TripLineItemRepository(db, user.tenantId)
  const lineItemsByTrip = new Map(
    await Promise.all(trips.map(async (t) => [t.id, await lineItemRepo.listForTrip(t.id)] as const))
  )

  return (
    <div>
      <h1>行程管理</h1>

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
                <th>收支項目</th>
                {canManage && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => {
                const nextOptions = TRIP_STATUS_TRANSITIONS[t.status]
                const lineItems = lineItemsByTrip.get(t.id) ?? []
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
                    <td>
                      {lineItems.length === 0 ? (
                        '—'
                      ) : (
                        lineItems.map((li) => (
                          <span key={li.id} className="trip-chip" style={{ background: li.type === 'REVENUE' ? '#dcfce7' : '#fee2e2' }}>
                            {li.name} {li.type === 'REVENUE' ? '+' : '-'}
                            {Number(li.amount).toLocaleString()}
                          </span>
                        ))
                      )}
                    </td>
                    {canManage && (
                      <td>
                        {nextOptions.length > 0 && (
                          <form action={transitionStatusAction} className="row-form">
                            <input type="hidden" name="tripId" value={t.id} />
                            <select name="nextStatus" required defaultValue="">
                              <option value="" disabled>
                                變更狀態
                              </option>
                              {nextOptions.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                            <button className="btn" type="submit">
                              套用
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {canManage && trips.length > 0 && (
        <div className="app-section">
          <h2>新增行程收支項目</h2>
          <form action={addLineItemAction} className="inline-form">
            <div className="field">
              <label>行程</label>
              <select name="tripId" required defaultValue="">
                <option value="" disabled>
                  選擇行程
                </option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.startDate.toLocaleDateString('zh-TW')} {t.routeDescription}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>類型</label>
              <select name="type" required defaultValue="REVENUE">
                <option value="REVENUE">收入</option>
                <option value="COST">成本</option>
              </select>
            </div>
            <div className="field">
              <label>項目名稱</label>
              <input name="name" placeholder="車資 / 油資" required />
            </div>
            <div className="field">
              <label>金額</label>
              <input name="amount" type="number" min="0" step="1" required />
            </div>
            <button className="btn" type="submit">
              新增項目
            </button>
          </form>
        </div>
      )}

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
            <div className="field">
              <label>客戶</label>
              <select name="clientId" required defaultValue="">
                <option value="" disabled>
                  選擇客戶
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
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
    </div>
  )
}
