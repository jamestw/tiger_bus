import { describe, it, expect } from 'vitest'
import { calculateSettlement, type SettlementTrip, type SettlementFixedCost } from '@/lib/settlement/calculate-settlement'

describe('calculateSettlement', () => {
  it('sums revenue and cost line items for completed trips in the target month', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-07-05'), status: 'COMPLETED',
        lineItems: [
          { type: 'REVENUE', amount: 8000 },
          { type: 'COST', amount: 2500 },
        ],
      },
    ]

    const result = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })

    expect(result.totalRevenue).toBe(8000)
    expect(result.totalCost).toBe(2500)
    expect(result.payableAmount).toBe(5500)
  })

  it('excludes trips not in the target month', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-06-30'), status: 'COMPLETED',
        lineItems: [{ type: 'REVENUE', amount: 8000 }],
      },
    ]

    const result = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })

    expect(result.totalRevenue).toBe(0)
  })

  it('excludes trips that are not COMPLETED', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-07-05'), status: 'CONFIRMED',
        lineItems: [{ type: 'REVENUE', amount: 8000 }],
      },
    ]

    const result = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })

    expect(result.totalRevenue).toBe(0)
  })

  it('counts a trip that spans a month boundary toward its start-date month', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-07-30'), status: 'COMPLETED',
        lineItems: [{ type: 'REVENUE', amount: 18000 }],
      },
    ]

    const julyResult = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })
    const augustResult = calculateSettlement({ trips, fixedCosts: [], month: '2026-08' })

    expect(julyResult.totalRevenue).toBe(18000)
    expect(augustResult.totalRevenue).toBe(0)
  })

  it('subtracts vehicle fixed costs from the payable amount', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-06-01'), status: 'COMPLETED',
        lineItems: [{ type: 'REVENUE', amount: 10000 }],
      },
    ]
    const fixedCosts: SettlementFixedCost[] = [
      { name: '車體險', amount: 4793 },
      { name: '常年會費', amount: 3000 },
    ]

    const result = calculateSettlement({ trips, fixedCosts, month: '2026-06' })

    expect(result.totalCost).toBe(7793)
    expect(result.payableAmount).toBe(2207)
  })
})
