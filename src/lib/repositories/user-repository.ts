import type { PrismaClient, User, Role } from '@prisma/client'
import { hashPassword } from '@/lib/password'

export type TenantRole = Exclude<Role, 'SUPERADMIN'>

export type UserWithDriver = User & { driver: { id: string; name: string } | null }

export class UserRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  list(): Promise<UserWithDriver[]> {
    return this.db.user.findMany({
      where: { tenantId: this.tenantId },
      include: { driver: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async create(input: {
    name: string
    email: string
    password: string
    role: TenantRole
    driverId?: string
  }): Promise<User> {
    if (input.driverId) {
      const driver = await this.db.driver.findUnique({ where: { id: input.driverId } })
      if (!driver || driver.tenantId !== this.tenantId) {
        throw new Error(`Driver ${input.driverId} not found in tenant ${this.tenantId}`)
      }
      if (driver.userId) {
        throw new Error(`Driver ${input.driverId} already has a linked login account`)
      }
    }

    const passwordHash = await hashPassword(input.password)

    return this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId: this.tenantId,
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
        },
      })

      if (input.driverId) {
        await tx.driver.update({ where: { id: input.driverId }, data: { userId: user.id } })
      }

      return user
    })
  }
}
