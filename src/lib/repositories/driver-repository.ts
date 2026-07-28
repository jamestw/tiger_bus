import type { PrismaClient, Driver } from '@prisma/client'

export class DriverRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  create(input: { name: string; phone?: string }): Promise<Driver> {
    return this.db.driver.create({
      data: { tenantId: this.tenantId, name: input.name, phone: input.phone },
    })
  }

  list(): Promise<Driver[]> {
    return this.db.driver.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async findById(id: string): Promise<Driver | null> {
    const driver = await this.db.driver.findUnique({ where: { id } })
    if (!driver || driver.tenantId !== this.tenantId) return null
    return driver
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    const driver = await this.db.driver.findUnique({ where: { userId } })
    if (!driver || driver.tenantId !== this.tenantId) return null
    return driver
  }

  async setDefaultVehicle(driverId: string, vehicleId: string): Promise<Driver> {
    const driver = await this.findById(driverId)
    if (!driver) throw new Error(`Driver ${driverId} not found in tenant ${this.tenantId}`)

    const vehicle = await this.db.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle || vehicle.tenantId !== this.tenantId) {
      throw new Error(`Vehicle ${vehicleId} not found in tenant ${this.tenantId}`)
    }

    return this.db.driver.update({
      where: { id: driverId },
      data: { defaultVehicleId: vehicleId },
    })
  }
}
