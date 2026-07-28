import type { PrismaClient, Tenant, CalendarViewMode } from '@prisma/client'

// Scoped to a single tenant — a TENANT_ADMIN managing their own profile,
// never a cross-tenant listing (that's platform-queries.ts, superadmin-only).
export class TenantRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  get(): Promise<Tenant> {
    return this.db.tenant.findUniqueOrThrow({ where: { id: this.tenantId } })
  }

  update(input: {
    name: string
    contactName: string | null
    contactPhone: string | null
    defaultCalendarView: CalendarViewMode
  }): Promise<Tenant> {
    return this.db.tenant.update({
      where: { id: this.tenantId },
      data: {
        name: input.name,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        defaultCalendarView: input.defaultCalendarView,
      },
    })
  }
}
