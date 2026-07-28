import type { PrismaClient, Client } from '@prisma/client'

export class ClientRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  create(input: { name: string; phone?: string }): Promise<Client> {
    return this.db.client.create({
      data: { tenantId: this.tenantId, name: input.name, phone: input.phone },
    })
  }

  list(): Promise<Client[]> {
    return this.db.client.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async findById(id: string): Promise<Client | null> {
    const client = await this.db.client.findUnique({ where: { id } })
    if (!client || client.tenantId !== this.tenantId) return null
    return client
  }
}
