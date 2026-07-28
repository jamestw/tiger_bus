import type { PrismaClient, SettlementRecord } from '@prisma/client'

export class SettlementRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  generate(input: {
    driverId: string
    month: string
    totalRevenue: number
    totalCost: number
    payableAmount: number
  }): Promise<SettlementRecord> {
    return this.db.settlementRecord.upsert({
      where: {
        tenantId_driverId_month: {
          tenantId: this.tenantId, driverId: input.driverId, month: input.month,
        },
      },
      create: {
        tenantId: this.tenantId,
        driverId: input.driverId,
        month: input.month,
        totalRevenue: input.totalRevenue,
        totalCost: input.totalCost,
        payableAmount: input.payableAmount,
        status: 'GENERATED',
      },
      update: {
        totalRevenue: input.totalRevenue,
        totalCost: input.totalCost,
        payableAmount: input.payableAmount,
        status: 'GENERATED',
        paidAt: null,
      },
    })
  }

  listForDriver(driverId: string): Promise<SettlementRecord[]> {
    return this.db.settlementRecord.findMany({
      where: { tenantId: this.tenantId, driverId },
      orderBy: { month: 'desc' },
    })
  }

  async markPaid(settlementId: string): Promise<SettlementRecord> {
    const settlement = await this.db.settlementRecord.findUnique({ where: { id: settlementId } })
    if (!settlement || settlement.tenantId !== this.tenantId) {
      throw new Error(`Settlement ${settlementId} not found in tenant ${this.tenantId}`)
    }

    return this.db.settlementRecord.update({
      where: { id: settlementId },
      data: { status: 'PAID', paidAt: new Date() },
    })
  }

  async delete(settlementId: string): Promise<void> {
    const settlement = await this.db.settlementRecord.findUnique({ where: { id: settlementId } })
    if (!settlement || settlement.tenantId !== this.tenantId) {
      throw new Error(`Settlement ${settlementId} not found in tenant ${this.tenantId}`)
    }
    if (settlement.status === 'PAID') {
      throw new Error('已標記為 PAID 的結算單不能刪除，請先確認付款狀態 (cannot delete a PAID settlement)')
    }

    await this.db.settlementRecord.delete({ where: { id: settlementId } })
  }
}
