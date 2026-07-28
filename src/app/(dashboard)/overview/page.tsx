import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOperationsOverview, getRecentTrips } from '@/app/api/overview/handlers'
import { RevenueChart } from './revenue-chart'

const RECENT_TRIPS_LIMIT = 5
const REVENUE_CHART_MONTHS = 6

export default async function OverviewPage() {
  const session = await auth()
  if (!session?.user) return null

  const overview = await getOperationsOverview(db, session.user)
  const latest = overview[overview.length - 1]
  const chartData = overview.slice(-REVENUE_CHART_MONTHS)

  const canSeeTenantDetails = ['TENANT_ADMIN', 'ACCOUNTANT'].includes(session.user.role)
  const recentTrips = canSeeTenantDetails ? await getRecentTrips(db, session.user, RECENT_TRIPS_LIMIT) : []

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

      {chartData.length > 0 && (
        <div className="app-section">
          <h2>收入趨勢</h2>
          <RevenueChart data={chartData} />
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

      {canSeeTenantDetails && (
        <div className="app-section">
          <h2>最近行程</h2>
          {recentTrips.length === 0 ? (
            <div className="empty-state">還沒有任何行程</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>名稱</th>
                  <th>客戶</th>
                  <th>車輛類型</th>
                  <th>人數</th>
                  <th>司機</th>
                  <th>電話</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((t) => (
                  <tr key={t.id}>
                    <td>{t.routeDescription}</td>
                    <td>{t.client.name}</td>
                    <td>{t.vehicle.type}</td>
                    <td>{t.passengerCount}</td>
                    <td>{t.driver.name}</td>
                    <td>{t.driver.phone ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
