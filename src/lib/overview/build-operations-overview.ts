export interface OverviewSettlement {
  month: string
  totalRevenue: number
  totalCost: number
}

export interface MonthlyOverview {
  month: string
  totalRevenue: number
  totalCost: number
  netProfit: number
}

export function buildOperationsOverview(settlements: OverviewSettlement[]): MonthlyOverview[] {
  const byMonth = new Map<string, { totalRevenue: number; totalCost: number }>()

  for (const s of settlements) {
    const existing = byMonth.get(s.month) ?? { totalRevenue: 0, totalCost: 0 }
    byMonth.set(s.month, {
      totalRevenue: existing.totalRevenue + s.totalRevenue,
      totalCost: existing.totalCost + s.totalCost,
    })
  }

  return Array.from(byMonth.entries())
    .map(([month, totals]) => ({
      month,
      totalRevenue: totals.totalRevenue,
      totalCost: totals.totalCost,
      netProfit: totals.totalRevenue - totals.totalCost,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}
