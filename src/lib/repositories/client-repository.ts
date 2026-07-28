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
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    })
  }

  listAll(): Promise<Client[]> {
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

  async update(clientId: string, input: { name: string; phone?: string }): Promise<Client> {
    const client = await this.findById(clientId)
    if (!client) throw new Error(`Client ${clientId} not found in tenant ${this.tenantId}`)

    return this.db.client.update({
      where: { id: clientId },
      data: { name: input.name, phone: input.phone },
    })
  }

  async softDelete(clientId: string): Promise<Client> {
    const client = await this.findById(clientId)
    if (!client) throw new Error(`Client ${clientId} not found in tenant ${this.tenantId}`)

    return this.db.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    })
  }
}
