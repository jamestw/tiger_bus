import { describe, it, expect } from 'vitest'
import { colorTagForClient, COLOR_PALETTE } from '@/lib/color-tag'

describe('colorTagForClient', () => {
  it('always returns the same color for the same client id', () => {
    const first = colorTagForClient('client-abc-123')
    const second = colorTagForClient('client-abc-123')
    expect(first).toBe(second)
  })

  it('returns a color from the defined palette', () => {
    const color = colorTagForClient('client-abc-123')
    expect(COLOR_PALETTE).toContain(color)
  })

  it('spreads different client ids across different colors', () => {
    const colors = new Set(
      ['client-1', 'client-2', 'client-3', 'client-4', 'client-5', 'client-6'].map(colorTagForClient)
    )
    expect(colors.size).toBeGreaterThan(1)
  })
})
