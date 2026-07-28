type ChartPoint = { month: string; totalRevenue: number }

const BAR_WIDTH = 36
const GAP = 20
const CHART_HEIGHT = 100
const LABEL_SPACE = 32

export function RevenueChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) return null

  const max = Math.max(...data.map((d) => d.totalRevenue), 1)
  const width = data.length * (BAR_WIDTH + GAP) + GAP

  return (
    <svg
      viewBox={`0 0 ${width} ${CHART_HEIGHT + LABEL_SPACE}`}
      className="revenue-chart"
      role="img"
      aria-label="月度收入趨勢圖"
    >
      {data.map((d, i) => {
        const barHeight = max === 0 ? 0 : (d.totalRevenue / max) * CHART_HEIGHT
        const x = GAP + i * (BAR_WIDTH + GAP)
        const y = CHART_HEIGHT - barHeight
        return (
          <g key={d.month}>
            <text x={x + BAR_WIDTH / 2} y={y - 6} textAnchor="middle" className="revenue-chart__value">
              {d.totalRevenue.toLocaleString()}
            </text>
            <rect x={x} y={y} width={BAR_WIDTH} height={barHeight} rx="4" className="revenue-chart__bar" />
            <text
              x={x + BAR_WIDTH / 2}
              y={CHART_HEIGHT + 20}
              textAnchor="middle"
              className="revenue-chart__label"
            >
              {d.month}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
