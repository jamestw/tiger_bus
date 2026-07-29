import type { PrismaClient, Trip, TripStatus, Client, Driver, Vehicle } from '@prisma/client'

export type TripWithDetails = Trip & { client: Client; driver: Driver; vehicle: Vehicle }

export const TRIP_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export class TripRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  async create(input: {
    startDate: Date
    endDate: Date
    name?: string
    routeDescription: string
    passengerCount: number
    clientId: string
    bookedById: string
    driverId: string
  }): Promise<Trip> {
    if (input.endDate < input.startDate) {
      throw new Error('結束日期不能早於開始日期 (endDate must not be before startDate)')
    }

    const driver = await this.db.driver.findUnique({ where: { id: input.driverId } })
    if (!driver || driver.tenantId !== this.tenantId) {
      throw new Error(`Driver ${input.driverId} not found in tenant ${this.tenantId}`)
    }
    if (!driver.defaultVehicleId) {
      throw new Error(`Driver ${input.driverId} has no default vehicle bound`)
    }

    return this.db.trip.create({
      data: {
        tenantId: this.tenantId,
        startDate: input.startDate,
        endDate: input.endDate,
        name: input.name,
        routeDescription: input.routeDescription,
        passengerCount: input.passengerCount,
        clientId: input.clientId,
        bookedById: input.bookedById,
        driverId: input.driverId,
        vehicleId: driver.defaultVehicleId,
        status: 'PENDING',
      },
    })
  }

  listOverlappingRange(rangeStart: Date, rangeEnd: Date): Promise<Trip[]> {
    return this.db.trip.findMany({
      where: {
        tenantId: this.tenantId,
        startDate: { lte: rangeEnd },
        endDate: { gte: rangeStart },
      },
      orderBy: { startDate: 'asc' },
    })
  }

  async findById(id: string): Promise<Trip | null> {
    const trip = await this.db.trip.findUnique({ where: { id } })
    if (!trip || trip.tenantId !== this.tenantId) return null
    return trip
  }

  async update(
    tripId: string,
    input: {
      startDate: Date
      endDate: Date
      name?: string
      clientId: string
      passengerCount: number
      driverId: string
    }
  ): Promise<Trip> {
    const trip = await this.findById(tripId)
    if (!trip) throw new Error(`Trip ${tripId} not found in tenant ${this.tenantId}`)

    if (input.endDate < input.startDate) {
      throw new Error('結束日期不能早於開始日期 (endDate must not be before startDate)')
    }

    const driver = await this.db.driver.findUnique({ where: { id: input.driverId } })
    if (!driver || driver.tenantId !== this.tenantId) {
      throw new Error(`Driver ${input.driverId} not found in tenant ${this.tenantId}`)
    }
    if (!driver.defaultVehicleId) {
      throw new Error(`Driver ${input.driverId} has no default vehicle bound`)
    }

    return this.db.trip.update({
      where: { id: tripId },
      data: {
        startDate: input.startDate,
        endDate: input.endDate,
        name: input.name,
        clientId: input.clientId,
        passengerCount: input.passengerCount,
        driverId: input.driverId,
        vehicleId: driver.defaultVehicleId,
      },
    })
  }

  listRecentWithDetails(limit: number): Promise<TripWithDetails[]> {
    return this.db.trip.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { startDate: 'desc' },
      take: limit,
      include: { client: true, driver: true, vehicle: true },
    })
  }

  async transitionStatus(tripId: string, nextStatus: TripStatus): Promise<Trip> {
    const trip = await this.findById(tripId)
    if (!trip) throw new Error(`Trip ${tripId} not found in tenant ${this.tenantId}`)

    if (!TRIP_STATUS_TRANSITIONS[trip.status].includes(nextStatus)) {
      throw new Error(`Illegal transition from ${trip.status} to ${nextStatus}`)
    }

    return this.db.trip.update({ where: { id: tripId }, data: { status: nextStatus } })
  }
}
