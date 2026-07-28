import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOperationsOverview } from '@/app/api/overview/handlers'

export default async function OverviewPage() {
  const session = await auth()
  if (!session?.user) return null

  const overview = await getOperationsOverview(db, session.user)
  const latest = overview[overview.length - 1]

  return (
    <div>
      <h1>儀表板總覽</h1>

      {latest && (
        <div className="app-section">
          <h2>{latest.month} 概況</h2>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card__label">總收入</div>
              <div className="stat-card__value">{latest.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="stat-card stat-card--muted">
              <div className="stat-card__label">總成本</div>
              <div className="stat-card__value">{latest.totalCost.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">淨利</div>
              <div className={`stat-card__value ${latest.netProfit >= 0 ? 'positive' : 'negative'}`}>
                {latest.netProfit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <td className={row.netProfit >= 0 ? 'figure-positive' : 'figure-negative'}>
                    {row.netProfit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
