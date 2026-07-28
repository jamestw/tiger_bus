import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { generateSettlement, markSettlementPaid, deleteSettlement } from '@/app/api/settlements/handlers'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { DeleteSettlementButton } from './delete-settlement-button'

async function generateSettlementAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await generateSettlement(db, session.user, {
    driverId: formData.get('driverId') as string,
    month: formData.get('month') as string,
  })
  revalidatePath('/settlements')
  revalidatePath('/overview')
}

async function markPaidAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await markSettlementPaid(db, session.user, formData.get('settlementId') as string)
  revalidatePath('/settlements')
}

async function deleteSettlementAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await deleteSettlement(db, session.user, formData.get('settlementId') as string)
  revalidatePath('/settlements')
  revalidatePath('/overview')
}

export default async function SettlementsPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.tenantId) return null
  const canManage = ['TENANT_ADMIN', 'ACCOUNTANT', 'SUPERADMIN'].includes(user.role)
  const canView = canManage || user.role === 'DRIVER'

  // Per the permission matrix, DISPATCHER has no access to settlement data at all.
  if (!canView) {
    return (
      <div>
        <h1>結算管理</h1>
        <div className="empty-state">你的角色沒有檢視結算資料的權限</div>
      </div>
    )
  }

  // DRIVER sessions must only ever see their own settlements — never the
  // full tenant list (that would leak every other driver's pay).
  let driverScopeId: string | null = null
  if (user.role === 'DRIVER') {
    const ownDriver = await new DriverRepository(db, user.tenantId).findByUserId(user.id)
    driverScopeId = ownDriver?.id ?? null
  }

  const settlements = await db.settlementRecord.findMany({
    where: {
      tenantId: user.tenantId,
      ...(user.role === 'DRIVER' ? { driverId: driverScopeId ?? '__none__' } : {}),
    },
    include: { driver: true },
    orderBy: { month: 'desc' },
  })
  const drivers = canManage ? await new DriverRepository(db, user.tenantId).list() : []

  return (
    <div>
      <h1>結算管理</h1>

      <div className="app-section">
        <h2>結算單清單</h2>
        {settlements.length === 0 ? (
          <div className="empty-state">還沒有任何結算單</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>司機</th>
                <th>月份</th>
                <th>收入</th>
                <th>成本</th>
                <th>應付金額</th>
                <th>狀態</th>
                {canManage && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id}>
                  <td>{s.driver.name}</td>
                  <td>{s.month}</td>
                  <td>{Number(s.totalRevenue).toLocaleString()}</td>
                  <td>{Number(s.totalCost).toLocaleString()}</td>
                  <td>{Number(s.payableAmount).toLocaleString()}</td>
                  <td>
                    <span className={s.status === 'PAID' ? 'pill pill--paid' : 'pill pill--pending'}>
                      {s.status === 'PAID' ? '已付款' : '已產生'}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      {s.status === 'GENERATED' && (
                        <div className="row-form">
                          <form action={markPaidAction}>
                            <input type="hidden" name="settlementId" value={s.id} />
                            <button className="btn" type="submit">
                              標記已付款
                            </button>
                          </form>
                          <DeleteSettlementButton
                            settlementId={s.id}
                            driverName={s.driver.name}
                            month={s.month}
                            deleteAction={deleteSettlementAction}
                          />
                        </div>
                      )}
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
          <h2>產生結算單</h2>
          <form action={generateSettlementAction} className="inline-form">
            <div className="field">
              <label>司機</label>
              <select name="driverId" required defaultValue="">
                <option value="" disabled>
                  選擇司機
                </option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>月份</label>
              <input name="month" type="month" required />
            </div>
            <button className="btn" type="submit">
              產生結算單
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
