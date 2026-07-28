import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { addTripLineItem } from '@/app/api/trips/[tripId]/line-items/handlers'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'
import { TripRepository, TRIP_STATUS_TRANSITIONS } from '@/lib/repositories/trip-repository'
import { STATUS_LABEL } from '@/lib/trip-status-label'
import { requireRole } from '@/lib/rbac'
import type { TripStatus } from '@prisma/client'

async function addLineItemAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  const tripId = formData.get('tripId') as string
  await addTripLineItem(db, session.user, tripId, {
    type: formData.get('type') as 'REVENUE' | 'COST',
    name: formData.get('name') as string,
    amount: Number(formData.get('amount')),
  })
  revalidatePath(`/trips/${tripId}`)
  revalidatePath('/trips')
}

async function transitionStatusAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user?.tenantId) return
  requireRole(session.user, ['TENANT_ADMIN', 'DISPATCHER'])
  const tripId = formData.get('tripId') as string
  await new TripRepository(db, session.user.tenantId).transitionStatus(
    tripId,
    formData.get('nextStatus') as TripStatus
  )
  revalidatePath(`/trips/${tripId}`)
  revalidatePath('/trips')
  revalidatePath('/calendar')
}

export default async function TripDetailPage({ params }: { params: { tripId: string } }) {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId) return null

  const trip = await new TripRepository(db, user.tenantId).findById(params.tripId)
  if (!trip) redirect('/trips')

  if (user.role === 'DRIVER') {
    const ownDriver = await new DriverRepository(db, user.tenantId).findByUserId(user.id)
    if (!ownDriver || ownDriver.id !== trip.driverId) redirect('/trips')
  }

  const canManage = ['TENANT_ADMIN', 'DISPATCHER', 'SUPERADMIN'].includes(user.role)
  const canSeeFinancials = ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'SUPERADMIN'].includes(user.role)

  const client = await new ClientRepository(db, user.tenantId).findById(trip.clientId)
  const driver = await new DriverRepository(db, user.tenantId).findById(trip.driverId)
  const lineItems = canSeeFinancials
    ? await new TripLineItemRepository(db, user.tenantId).listForTrip(trip.id)
    : []
  const revenue = lineItems.filter((li) => li.type === 'REVENUE').reduce((s, li) => s + Number(li.amount), 0)
  const cost = lineItems.filter((li) => li.type === 'COST').reduce((s, li) => s + Number(li.amount), 0)

  const nextStatusOptions = TRIP_STATUS_TRANSITIONS[trip.status]

  return (
    <div>
      <a href="/trips">← 回行程列表</a>
      <h1>{trip.routeDescription}</h1>

      <div className="app-section">
        <h2>行程資訊</h2>
        <table className="data-table">
          <tbody>
            <tr>
              <td>日期</td>
              <td>
                {trip.startDate.toLocaleDateString('zh-TW')}
                {trip.startDate.getTime() !== trip.endDate.getTime() &&
                  ` ～ ${trip.endDate.toLocaleDateString('zh-TW')}`}
              </td>
            </tr>
            <tr>
              <td>客戶</td>
              <td>{client?.name ?? '—'}</td>
            </tr>
            <tr>
              <td>司機</td>
              <td>{driver?.name ?? '—'}</td>
            </tr>
            <tr>
              <td>人數</td>
              <td>{trip.passengerCount}</td>
            </tr>
            <tr>
              <td>狀態</td>
              <td>
                {STATUS_LABEL[trip.status]}
                {canManage && nextStatusOptions.length > 0 && (
                  <form action={transitionStatusAction} className="row-form" style={{ display: 'inline-flex', marginLeft: '0.75rem' }}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <select name="nextStatus" required defaultValue="">
                      <option value="" disabled>
                        變更狀態
                      </option>
                      {nextStatusOptions.map((s) => (
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
            </tr>
          </tbody>
        </table>
      </div>

      {canSeeFinancials && (
        <div className="app-section">
          <h2>收支總覽</h2>
          <table className="data-table">
            <tbody>
              <tr>
                <td>收入合計</td>
                <td>{revenue.toLocaleString()}</td>
              </tr>
              <tr>
                <td>支出合計</td>
                <td>{cost.toLocaleString()}</td>
              </tr>
              <tr>
                <td>
                  <strong>淨額（司機該趟應收）</strong>
                </td>
                <td>
                  <strong>{(revenue - cost).toLocaleString()}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <h2 style={{ marginTop: '1.25rem' }}>收支項目明細</h2>
          {lineItems.length === 0 ? (
            <div className="empty-state">還沒有任何收支項目</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>類型</th>
                  <th>項目名稱</th>
                  <th>金額</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.id}>
                    <td>{li.type === 'REVENUE' ? '收入' : '支出'}</td>
                    <td>{li.name}</td>
                    <td>{Number(li.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {canManage && (
            <form action={addLineItemAction} className="inline-form" style={{ marginTop: '1rem' }}>
              <input type="hidden" name="tripId" value={trip.id} />
              <div className="field">
                <label>類型</label>
                <select name="type" required defaultValue="REVENUE">
                  <option value="REVENUE">收入</option>
                  <option value="COST">支出</option>
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
          )}
        </div>
      )}
    </div>
  )
}
