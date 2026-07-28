import type { PrismaClient, LineItemPreset, LineItemType } from '@prisma/client'

export class LineItemPresetRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  create(input: { name: string; type: LineItemType }): Promise<LineItemPreset> {
    return this.db.lineItemPreset.create({
      data: { tenantId: this.tenantId, name: input.name, type: input.type },
    })
  }

  list(): Promise<LineItemPreset[]> {
    return this.db.lineItemPreset.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async delete(presetId: string): Promise<LineItemPreset> {
    const preset = await this.db.lineItemPreset.findUnique({ where: { id: presetId } })
    if (!preset || preset.tenantId !== this.tenantId) {
      throw new Error(`LineItemPreset ${presetId} not found in tenant ${this.tenantId}`)
    }

    return this.db.lineItemPreset.delete({ where: { id: presetId } })
  }
}
