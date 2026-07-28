import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function SettlementsPage() {
  const session = await auth()
  if (!session?.user?.tenantId) return null

  const settlements = await db.settlementRecord.findMany({
    where: { tenantId: session.user.tenantId },
    include: { driver: true },
    orderBy: { month: 'desc' },
  })

  return (
    <table>
      <thead>
        <tr>
          <th>司機</th>
          <th>月份</th>
          <th>收入</th>
          <th>成本</th>
          <th>應付金額</th>
          <th>狀態</th>
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
            <td>{s.status === 'PAID' ? '已付款' : '已產生'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
