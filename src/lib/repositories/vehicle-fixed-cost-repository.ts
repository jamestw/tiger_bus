import type { PrismaClient, VehicleFixedCost } from '@prisma/client'

export class VehicleFixedCostRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  async add(input: {
    vehicleId: string
    name: string
    amount: number
    month: string
  }): Promise<VehicleFixedCost> {
    const vehicle = await this.db.vehicle.findUnique({ where: { id: input.vehicleId } })
    if (!vehicle || vehicle.tenantId !== this.tenantId) {
      throw new Error(`Vehicle ${input.vehicleId} not found in tenant ${this.tenantId}`)
    }

    return this.db.vehicleFixedCost.create({
      data: {
        tenantId: this.tenantId,
        vehicleId: input.vehicleId,
        name: input.name,
        amount: input.amount,
        month: input.month,
      },
    })
  }

  listForVehicleMonth(vehicleId: string, month: string): Promise<VehicleFixedCost[]> {
    return this.db.vehicleFixedCost.findMany({
      where: { tenantId: this.tenantId, vehicleId, month },
    })
  }
}
