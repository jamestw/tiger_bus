export interface SettlementTrip {
  id: string
  startDate: Date
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  lineItems: { type: 'REVENUE' | 'COST'; amount: number }[]
}

export interface SettlementFixedCost {
  name: string
  amount: number
}

export interface SettlementResult {
  totalRevenue: number
  totalCost: number
  payableAmount: number
}

function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function calculateSettlement(input: {
  trips: SettlementTrip[]
  fixedCosts: SettlementFixedCost[]
  month: string
}): SettlementResult {
  const tripsInMonth = input.trips.filter(
    (trip) => trip.status === 'COMPLETED' && monthOf(trip.startDate) === input.month
  )

  const tripRevenue = tripsInMonth
    .flatMap((t) => t.lineItems)
    .filter((li) => li.type === 'REVENUE')
    .reduce((sum, li) => sum + li.amount, 0)

  const tripCost = tripsInMonth
    .flatMap((t) => t.lineItems)
    .filter((li) => li.type === 'COST')
    .reduce((sum, li) => sum + li.amount, 0)

  const fixedCostTotal = input.fixedCosts.reduce((sum, c) => sum + c.amount, 0)

  const totalRevenue = tripRevenue
  const totalCost = tripCost + fixedCostTotal

  return {
    totalRevenue,
    totalCost,
    payableAmount: totalRevenue - totalCost,
  }
}
