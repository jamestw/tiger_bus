export const COLOR_PALETTE = [
  '#ffe9a8', // yellow
  '#c9f0d0', // green
  '#ffd0e0', // pink
  '#c8def0', // blue
  '#e6d5f7', // purple
  '#ffd9b8', // orange
] as const

export type ColorTag = (typeof COLOR_PALETTE)[number]

export function colorTagForClient(clientId: string): ColorTag {
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length]
}
