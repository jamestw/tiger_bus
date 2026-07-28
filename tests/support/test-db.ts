import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL })
export const testDb = new PrismaClient({ adapter })

const TABLES_IN_DELETE_ORDER = [
  'TripLineItem',
  'LineItemPreset',
  'SettlementRecord',
  'Trip',
  'VehicleFixedCost',
  'Vehicle',
  'Client',
  'Driver',
  'User',
  'Tenant',
]

export async function resetTestDb() {
  for (const table of TABLES_IN_DELETE_ORDER) {
    await testDb.$executeRawUnsafe(`DELETE FROM "${table}"`)
  }
}
