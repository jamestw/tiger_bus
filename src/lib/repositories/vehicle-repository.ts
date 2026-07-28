import type { PrismaClient, Vehicle } from '@prisma/client'

export class VehicleRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  create(input: {
    type: string
    plateNumber: string
    capacity: number
    lastInspectionDate?: Date
  }): Promise<Vehicle> {
    return this.db.vehicle.create({
      data: {
        tenantId: this.tenantId,
        type: input.type,
        plateNumber: input.plateNumber,
        capacity: input.capacity,
        lastInspectionDate: input.lastInspectionDate,
      },
    })
  }

  list(): Promise<Vehicle[]> {
    return this.db.vehicle.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { plateNumber: 'asc' },
    })
  }

  listAll(): Promise<Vehicle[]> {
    return this.db.vehicle.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { plateNumber: 'asc' },
    })
  }

  async findById(id: string): Promise<Vehicle | null> {
    const vehicle = await this.db.vehicle.findUnique({ where: { id } })
    if (!vehicle || vehicle.tenantId !== this.tenantId) return null
    return vehicle
  }

  async update(
    vehicleId: string,
    input: { type: string; plateNumber: string; capacity: number; lastInspectionDate?: Date }
  ): Promise<Vehicle> {
    const vehicle = await this.findById(vehicleId)
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found in tenant ${this.tenantId}`)

    return this.db.vehicle.update({
      where: { id: vehicleId },
      data: {
        type: input.type,
        plateNumber: input.plateNumber,
        capacity: input.capacity,
        lastInspectionDate: input.lastInspectionDate,
      },
    })
  }

  async softDelete(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.findById(vehicleId)
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found in tenant ${this.tenantId}`)

    return this.db.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date() },
    })
  }
}
