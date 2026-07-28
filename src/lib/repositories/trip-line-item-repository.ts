import type { PrismaClient, TripLineItem, LineItemType } from '@prisma/client'

export class TripLineItemRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  async add(input: {
    tripId: string
    type: LineItemType
    name: string
    amount: number
  }): Promise<TripLineItem> {
    const trip = await this.db.trip.findUnique({ where: { id: input.tripId } })
    if (!trip || trip.tenantId !== this.tenantId) {
      throw new Error(`Trip ${input.tripId} not found in tenant ${this.tenantId}`)
    }

    return this.db.tripLineItem.create({
      data: {
        tenantId: this.tenantId,
        tripId: input.tripId,
        type: input.type,
        name: input.name,
        amount: input.amount,
      },
    })
  }

  listForTrip(tripId: string): Promise<TripLineItem[]> {
    return this.db.tripLineItem.findMany({
      where: { tenantId: this.tenantId, tripId },
    })
  }
}
