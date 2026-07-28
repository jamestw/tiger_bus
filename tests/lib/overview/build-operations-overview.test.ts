import { describe, it, expect } from 'vitest'
import { buildOperationsOverview, type OverviewSettlement } from '@/lib/overview/build-operations-overview'

describe('buildOperationsOverview', () => {
  it('rolls up total revenue, cost and profit per month across all drivers', () => {
    const settlements: OverviewSettlement[] = [
      { month: '2026-06', totalRevenue: 10000, totalCost: 4000 },
      { month: '2026-06', totalRevenue: 8000, totalCost: 3000 },
      { month: '2026-07', totalRevenue: 5000, totalCost: 2000 },
    ]

    const overview = buildOperationsOverview(settlements)

    expect(overview).toEqual([
      { month: '2026-06', totalRevenue: 18000, totalCost: 7000, netProfit: 11000 },
      { month: '2026-07', totalRevenue: 5000, totalCost: 2000, netProfit: 3000 },
    ])
  })

  it('returns months sorted chronologically ascending', () => {
    const settlements: OverviewSettlement[] = [
      { month: '2026-07', totalRevenue: 100, totalCost: 0 },
      { month: '2026-01', totalRevenue: 200, totalCost: 0 },
    ]

    const overview = buildOperationsOverview(settlements)

    expect(overview.map((o) => o.month)).toEqual(['2026-01', '2026-07'])
  })

  it('returns an empty array for no settlements', () => {
    expect(buildOperationsOverview([])).toEqual([])
  })
})
