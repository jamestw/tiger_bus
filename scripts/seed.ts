import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/password'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

async function main() {
  const tenant = await db.tenant.create({ data: { name: '測試車行' } })

  const passwordHash = await hashPassword('password123')

  await db.user.create({
    data: { email: 'superadmin@tigerbus.dev', passwordHash, name: 'Super Admin', role: 'SUPERADMIN' },
  })
  await db.user.create({
    data: { tenantId: tenant.id, email: 'admin@test-fleet.dev', passwordHash, name: '車行管理者', role: 'TENANT_ADMIN' },
  })
  await db.user.create({
    data: { tenantId: tenant.id, email: 'dispatcher@test-fleet.dev', passwordHash, name: '調度接單', role: 'DISPATCHER' },
  })
  await db.user.create({
    data: { tenantId: tenant.id, email: 'accountant@test-fleet.dev', passwordHash, name: '會計', role: 'ACCOUNTANT' },
  })

  const vehicle = await db.vehicle.create({
    data: {
      tenantId: tenant.id, type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
      lastInspectionDate: new Date('2026-05-01'),
    },
  })

  const driverUser = await db.user.create({
    data: { tenantId: tenant.id, email: 'driver@test-fleet.dev', passwordHash, name: '陳大新', role: 'DRIVER' },
  })
  await db.driver.create({
    data: {
      tenantId: tenant.id, name: '陳大新', phone: '0912345678',
      userId: driverUser.id, defaultVehicleId: vehicle.id,
    },
  })

  await db.client.create({ data: { tenantId: tenant.id, name: '長榮旅行社', phone: '02-1234-5678' } })

  console.log('Seed complete. Test tenant:', tenant.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
