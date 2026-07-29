import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/password'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

async function main() {
  const email = process.env.SUPERADMIN_EMAIL
  const password = process.env.SUPERADMIN_PASSWORD
  const name = process.env.SUPERADMIN_NAME || 'Super Admin'
  if (!email || !password) {
    throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set')
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Superadmin ${email} already exists, skipping.`)
    return
  }

  const passwordHash = await hashPassword(password)
  await db.user.create({
    data: { email, passwordHash, name, role: 'SUPERADMIN' },
  })
  console.log(`Created superadmin: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
