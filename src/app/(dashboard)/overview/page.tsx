import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOperationsOverview } from '@/app/api/overview/handlers'

export default async function OverviewPage() {
  const session = await auth()
  if (!session?.user) return null

  const overview = await getOperationsOverview(db, session.user)

  return (
    <div>
      <h1>儀表板總覽</h1>
      <div className="app-section">
        <h2>{session.user.role === 'SUPERADMIN' ? '全平台月度損益' : '本車行月度損益'}</h2>
        {overview.length === 0 ? (
          <div className="empty-state">還沒有任何結算資料</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>月份</th>
                <th>總收入</th>
                <th>總成本</th>
                <th>淨利</th>
              </tr>
            </thead>
            <tbody>
              {overview.map((row) => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td>{row.totalRevenue.toLocaleString()}</td>
                  <td>{row.totalCost.toLocaleString()}</td>
                  <td>{row.netProfit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
