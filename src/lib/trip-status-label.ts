import type { TripStatus } from '@prisma/client'

export const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: '待確認',
  CONFIRMED: '已確認',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}
