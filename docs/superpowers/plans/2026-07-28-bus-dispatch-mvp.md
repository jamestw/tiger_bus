# 巴士調度派遣管理系統 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant bus dispatch management system replacing the manual spreadsheet workflow — trip creation, driver/vehicle assignment, dual calendar views, dynamic per-trip revenue/cost line items, and monthly driver settlement generation.

**Architecture:** Next.js (App Router, TypeScript) monolith with API routes, PostgreSQL via Prisma. Tenant isolation is enforced by an explicit tenant-scoped repository layer (not Prisma middleware/extensions) — every repository method requires a `tenantId` and every query is built with it baked in, so there is no code path that queries tenant data without it. Superadmin cross-tenant queries live in a separate, explicitly-named module (`platform-queries.ts`) that is never imported by tenant-facing code.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, PostgreSQL, Prisma ORM, Auth.js (NextAuth v5) with Credentials provider, Vitest for tests, bcrypt for password hashing, Docker Compose for local Postgres.

---

## File Structure Overview

```
prisma/
  schema.prisma
docker-compose.yml
.env.example
src/
  lib/
    db.ts                          # Prisma client singleton
    auth.ts                        # Auth.js config, typed session
    password.ts                    # bcrypt hash/verify
    rbac.ts                        # requireRole guard
    color-tag.ts                   # deterministic client -> color
    repositories/
      types.ts                     # shared domain types (Money, etc.)
      driver-repository.ts
      vehicle-repository.ts
      vehicle-fixed-cost-repository.ts
      client-repository.ts
      trip-repository.ts
      trip-line-item-repository.ts
      settlement-repository.ts
    calendar/
      build-calendar-view.ts       # pure function: trips -> driver-column / month views
    settlement/
      calculate-settlement.ts      # pure function: trips + fixed costs -> payable amount
    overview/
      build-operations-overview.ts # pure function: monthly P&L rollup
  app/
    api/
      drivers/route.ts
      vehicles/route.ts
      clients/route.ts
      trips/route.ts
      trips/[tripId]/line-items/route.ts
      calendar/route.ts
      settlements/route.ts
      overview/route.ts
    (dashboard)/
      login/page.tsx
      calendar/page.tsx
      settlements/page.tsx
tests/
  (mirrors src/ structure)
scripts/
  seed.ts
```

---

### Task 0: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.gitignore` (already exists — extend it)

- [ ] **Step 1: Create Next.js app with TypeScript**

Run:
```bash
npx create-next-app@14 . --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm
```

When prompted about the existing `.gitignore` / non-empty directory, allow it to merge (the directory currently only has `.gitignore` and `docs/`).

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s http://localhost:3100 | head -c 200`
Expected: HTML output containing `<!DOCTYPE html>`. Stop the dev server afterward (`kill %1`).

- [ ] **Step 3: Add test dependencies**

Run:
```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: false,
  },
})
```

Add to `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Vitest"
```

---

### Task 1: Local PostgreSQL via Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.env` (not committed — in `.gitignore` already)

- [ ] **Step 1: Write docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: tiger_bus
      POSTGRES_PASSWORD: tiger_bus
      POSTGRES_DB: tiger_bus_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres_test:
    image: postgres:16
    environment:
      POSTGRES_USER: tiger_bus
      POSTGRES_PASSWORD: tiger_bus
      POSTGRES_DB: tiger_bus_test
    ports:
      - "5433:5432"

volumes:
  postgres_data:
```

- [ ] **Step 2: Write .env.example**

```bash
DATABASE_URL="postgresql://tiger_bus:tiger_bus@localhost:5432/tiger_bus_dev"
TEST_DATABASE_URL="postgresql://tiger_bus:tiger_bus@localhost:5433/tiger_bus_test"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: Create local .env from the example**

Run: `cp .env.example .env`

- [ ] **Step 4: Start the databases and verify**

Run: `docker compose up -d`
Run: `docker compose ps`
Expected: both `postgres` and `postgres_test` show `running`/`healthy`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker-compose for local and test Postgres"
```

---

### Task 2: Prisma schema — full data model

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Install Prisma**

Run: `npm install -D prisma` and `npm install @prisma/client`
Run: `npx prisma init --datasource-provider postgresql` (this creates `prisma/schema.prisma` — overwrite it with the content below)

- [ ] **Step 2: Write the full schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPERADMIN
  TENANT_ADMIN
  DISPATCHER
  ACCOUNTANT
  DRIVER
}

enum TripStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

enum LineItemType {
  REVENUE
  COST
}

enum SettlementStatus {
  GENERATED
  PAID
}

model Tenant {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  users             User[]
  drivers           Driver[]
  vehicles          Vehicle[]
  vehicleFixedCosts VehicleFixedCost[]
  clients           Client[]
  trips             Trip[]
  tripLineItems     TripLineItem[]
  settlements       SettlementRecord[]
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role
  tenantId     String?
  tenant       Tenant?  @relation(fields: [tenantId], references: [id])
  createdAt    DateTime @default(now())

  driver       Driver?
  bookedTrips  Trip[]   @relation("TripBookedBy")

  @@index([tenantId])
}

model Driver {
  id               String   @id @default(cuid())
  tenantId         String
  tenant           Tenant   @relation(fields: [tenantId], references: [id])
  name             String
  phone            String?
  userId           String?  @unique
  user             User?    @relation(fields: [userId], references: [id])
  defaultVehicleId String?
  defaultVehicle   Vehicle? @relation("DriverDefaultVehicle", fields: [defaultVehicleId], references: [id])
  createdAt        DateTime @default(now())

  ownedVehicles    Vehicle[]          @relation("VehicleOwnerDriver")
  trips            Trip[]
  settlements      SettlementRecord[]

  @@index([tenantId])
}

model Vehicle {
  id                 String    @id @default(cuid())
  tenantId           String
  tenant             Tenant    @relation(fields: [tenantId], references: [id])
  type               String
  plateNumber        String
  capacity           Int
  lastInspectionDate DateTime?
  driverId           String?
  driver             Driver?   @relation("VehicleOwnerDriver", fields: [driverId], references: [id])
  createdAt          DateTime  @default(now())

  defaultForDrivers Driver[]           @relation("DriverDefaultVehicle")
  fixedCosts        VehicleFixedCost[]
  trips             Trip[]

  @@index([tenantId])
  @@unique([tenantId, plateNumber])
}

model VehicleFixedCost {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  vehicleId String
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [id])
  name      String
  amount    Decimal  @db.Decimal(10, 2)
  month     String
  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([vehicleId, month])
}

model Client {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  name      String
  phone     String?
  createdAt DateTime @default(now())

  trips     Trip[]

  @@index([tenantId])
}

model Trip {
  id               String     @id @default(cuid())
  tenantId         String
  tenant           Tenant     @relation(fields: [tenantId], references: [id])
  startDate        DateTime
  endDate          DateTime
  routeDescription String
  passengerCount   Int
  clientId         String
  client           Client     @relation(fields: [clientId], references: [id])
  bookedById       String
  bookedBy         User       @relation("TripBookedBy", fields: [bookedById], references: [id])
  driverId         String
  driver           Driver     @relation(fields: [driverId], references: [id])
  vehicleId        String
  vehicle          Vehicle    @relation(fields: [vehicleId], references: [id])
  status           TripStatus @default(PENDING)
  createdAt        DateTime   @default(now())

  lineItems        TripLineItem[]

  @@index([tenantId])
  @@index([driverId, startDate])
}

model TripLineItem {
  id        String       @id @default(cuid())
  tenantId  String
  tenant    Tenant       @relation(fields: [tenantId], references: [id])
  tripId    String
  trip      Trip         @relation(fields: [tripId], references: [id])
  type      LineItemType
  name      String
  amount    Decimal      @db.Decimal(10, 2)
  createdAt DateTime     @default(now())

  @@index([tenantId])
  @@index([tripId])
}

model SettlementRecord {
  id            String           @id @default(cuid())
  tenantId      String
  tenant        Tenant           @relation(fields: [tenantId], references: [id])
  driverId      String
  driver        Driver           @relation(fields: [driverId], references: [id])
  month         String
  totalRevenue  Decimal          @db.Decimal(10, 2)
  totalCost     Decimal          @db.Decimal(10, 2)
  payableAmount Decimal          @db.Decimal(10, 2)
  status        SettlementStatus @default(GENERATED)
  generatedAt   DateTime         @default(now())
  paidAt        DateTime?

  @@index([tenantId])
  @@unique([tenantId, driverId, month])
}
```

Note: `month` fields use `"YYYY-MM"` string format throughout (e.g. `"2026-07"`) — simpler to index, compare and unit-test than DB date-truncation.

- [ ] **Step 3: Run the initial migration against the dev database**

Run: `npx prisma migrate dev --name init`
Expected: `Your database is now in sync with your schema.` and a new file under `prisma/migrations/`.

- [ ] **Step 4: Generate the Prisma client**

Run: `npx prisma generate`
Expected: `Generated Prisma Client`.

- [ ] **Step 5: Commit**

```bash
git add prisma package.json package-lock.json
git commit -m "feat: add Prisma schema for full data model"
```

---

### Task 3: Prisma client singleton + test database reset helper

**Files:**
- Create: `src/lib/db.ts`
- Create: `tests/support/test-db.ts`
- Test: `tests/support/test-db.test.ts`

- [ ] **Step 1: Write the Prisma client singleton**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

- [ ] **Step 2: Write the test database client + reset helper**

```typescript
// tests/support/test-db.ts
import { PrismaClient } from '@prisma/client'

export const testDb = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
})

const TABLES_IN_DELETE_ORDER = [
  'TripLineItem',
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
```

- [ ] **Step 3: Write a failing smoke test**

```typescript
// tests/support/test-db.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from './test-db'

describe('test database', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('starts empty and can create a tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Test Co' } })
    expect(tenant.name).toBe('Test Co')

    const count = await testDb.tenant.count()
    expect(count).toBe(1)
  })
})
```

- [ ] **Step 4: Push the schema to the test database and run the test**

Run: `TEST_DATABASE_URL=$(grep TEST_DATABASE_URL .env | cut -d= -f2-) npx prisma db push --schema prisma/schema.prisma --skip-generate` — actually simpler: run migrate against test DB directly:

Run: `DATABASE_URL="postgresql://tiger_bus:tiger_bus@localhost:5433/tiger_bus_test" npx prisma migrate deploy`
Run: `npm test -- tests/support/test-db.test.ts`
Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts tests/support
git commit -m "feat: add Prisma client singleton and test database reset helper"
```

---

### Task 4: Password hashing utility

**Files:**
- Create: `src/lib/password.ts`
- Test: `tests/lib/password.test.ts`

- [ ] **Step 1: Install bcrypt**

Run: `npm install bcryptjs` and `npm install -D @types/bcryptjs`

- [ ] **Step 2: Write the failing test**

```typescript
// tests/lib/password.test.ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password'

describe('password', () => {
  it('verifies a matching password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true)
  })

  it('rejects a non-matching password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/lib/password.test.ts`
Expected: FAIL — `Cannot find module '@/lib/password'`.

- [ ] **Step 4: Implement**

```typescript
// src/lib/password.ts
import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/lib/password.test.ts`
Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/password.ts tests/lib/password.test.ts package.json package-lock.json
git commit -m "feat: add password hashing utility"
```

---

### Task 5: Tenant-scoped repository pattern — DriverRepository (the exemplar)

This is the task that locks in the tenant-isolation mechanism from the spec. Every later repository follows this exact shape.

**Files:**
- Create: `src/lib/repositories/driver-repository.ts`
- Test: `tests/lib/repositories/driver-repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/repositories/driver-repository.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'

describe('DriverRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  async function makeTenant(name: string) {
    return testDb.tenant.create({ data: { name } })
  }

  it('creates a driver scoped to a tenant', async () => {
    const tenant = await makeTenant('Tiger Bus')
    const repo = new DriverRepository(testDb, tenant.id)

    const driver = await repo.create({ name: '志偉', phone: '0912345678' })

    expect(driver.name).toBe('志偉')
    expect(driver.tenantId).toBe(tenant.id)
  })

  it('only lists drivers belonging to its own tenant', async () => {
    const tenantA = await makeTenant('Tiger Bus')
    const tenantB = await makeTenant('Other Bus Co')
    await new DriverRepository(testDb, tenantA.id).create({ name: 'A-driver' })
    await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })

    const driversForA = await new DriverRepository(testDb, tenantA.id).list()

    expect(driversForA).toHaveLength(1)
    expect(driversForA[0].name).toBe('A-driver')
  })

  it('returns null when fetching another tenant\'s driver by id', async () => {
    const tenantA = await makeTenant('Tiger Bus')
    const tenantB = await makeTenant('Other Bus Co')
    const driverB = await new DriverRepository(testDb, tenantB.id).create({ name: 'B-driver' })

    const result = await new DriverRepository(testDb, tenantA.id).findById(driverB.id)

    expect(result).toBeNull()
  })

  it('updates a driver\'s default vehicle only within its own tenant', async () => {
    const tenant = await makeTenant('Tiger Bus')
    const vehicle = await testDb.vehicle.create({
      data: { tenantId: tenant.id, type: '中巴', plateNumber: 'ABC-123', capacity: 20 },
    })
    const repo = new DriverRepository(testDb, tenant.id)
    const driver = await repo.create({ name: '志偉' })

    const updated = await repo.setDefaultVehicle(driver.id, vehicle.id)

    expect(updated.defaultVehicleId).toBe(vehicle.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/repositories/driver-repository.test.ts`
Expected: FAIL — `Cannot find module '@/lib/repositories/driver-repository'`.

- [ ] **Step 3: Implement**

```typescript
// src/lib/repositories/driver-repository.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/repositories/driver-repository.test.ts`
Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/driver-repository.ts tests/lib/repositories/driver-repository.test.ts
git commit -m "feat: add tenant-scoped DriverRepository"
```

---

### Task 6: VehicleRepository + VehicleFixedCostRepository

**Files:**
- Create: `src/lib/repositories/vehicle-repository.ts`
- Create: `src/lib/repositories/vehicle-fixed-cost-repository.ts`
- Test: `tests/lib/repositories/vehicle-repository.test.ts`
- Test: `tests/lib/repositories/vehicle-fixed-cost-repository.test.ts`

- [ ] **Step 1: Write the failing VehicleRepository test**

```typescript
// tests/lib/repositories/vehicle-repository.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'

describe('VehicleRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a vehicle scoped to a tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new VehicleRepository(testDb, tenant.id)

    const vehicle = await repo.create({
      type: '大巴',
      plateNumber: 'KKA-9217',
      capacity: 45,
      lastInspectionDate: new Date('2026-05-01'),
    })

    expect(vehicle.plateNumber).toBe('KKA-9217')
    expect(vehicle.tenantId).toBe(tenant.id)
  })

  it('rejects a duplicate plate number within the same tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new VehicleRepository(testDb, tenant.id)
    await repo.create({ type: '大巴', plateNumber: 'KKA-9217', capacity: 45 })

    await expect(
      repo.create({ type: '中巴', plateNumber: 'KKA-9217', capacity: 20 })
    ).rejects.toThrow()
  })

  it('allows the same plate number across different tenants', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    await new VehicleRepository(testDb, tenantA.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })

    const vehicle = await new VehicleRepository(testDb, tenantB.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })

    expect(vehicle.plateNumber).toBe('KKA-9217')
  })

  it('lists only its own tenant\'s vehicles', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    await new VehicleRepository(testDb, tenantA.id).create({
      type: '大巴', plateNumber: 'AAA-001', capacity: 45,
    })
    await new VehicleRepository(testDb, tenantB.id).create({
      type: '大巴', plateNumber: 'BBB-002', capacity: 45,
    })

    const vehicles = await new VehicleRepository(testDb, tenantA.id).list()

    expect(vehicles).toHaveLength(1)
    expect(vehicles[0].plateNumber).toBe('AAA-001')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/repositories/vehicle-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement VehicleRepository**

```typescript
// src/lib/repositories/vehicle-repository.ts
import type { PrismaClient, Vehicle } from '@prisma/client'

export class VehicleRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  create(input: {
    type: string
    plateNumber: string
    capacity: number
    lastInspectionDate?: Date
  }): Promise<Vehicle> {
    return this.db.vehicle.create({
      data: {
        tenantId: this.tenantId,
        type: input.type,
        plateNumber: input.plateNumber,
        capacity: input.capacity,
        lastInspectionDate: input.lastInspectionDate,
      },
    })
  }

  list(): Promise<Vehicle[]> {
    return this.db.vehicle.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { plateNumber: 'asc' },
    })
  }

  async findById(id: string): Promise<Vehicle | null> {
    const vehicle = await this.db.vehicle.findUnique({ where: { id } })
    if (!vehicle || vehicle.tenantId !== this.tenantId) return null
    return vehicle
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/repositories/vehicle-repository.test.ts`
Expected: `4 passed`.

- [ ] **Step 5: Write the failing VehicleFixedCostRepository test**

```typescript
// tests/lib/repositories/vehicle-fixed-cost-repository.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { VehicleFixedCostRepository } from '@/lib/repositories/vehicle-fixed-cost-repository'

describe('VehicleFixedCostRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('adds a fixed cost line to a vehicle for a given month', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const vehicle = await new VehicleRepository(testDb, tenant.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const repo = new VehicleFixedCostRepository(testDb, tenant.id)

    const cost = await repo.add({
      vehicleId: vehicle.id, name: '車體險', amount: 4793, month: '2026-06',
    })

    expect(cost.name).toBe('車體險')
    expect(Number(cost.amount)).toBe(4793)
  })

  it('lists fixed costs for a vehicle in a specific month only', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const vehicle = await new VehicleRepository(testDb, tenant.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const repo = new VehicleFixedCostRepository(testDb, tenant.id)
    await repo.add({ vehicleId: vehicle.id, name: '車體險', amount: 4793, month: '2026-06' })
    await repo.add({ vehicleId: vehicle.id, name: '常年會費', amount: 3000, month: '2026-07' })

    const juneCosts = await repo.listForVehicleMonth(vehicle.id, '2026-06')

    expect(juneCosts).toHaveLength(1)
    expect(juneCosts[0].name).toBe('車體險')
  })

  it('rejects adding a cost to a vehicle from another tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const vehicleB = await new VehicleRepository(testDb, tenantB.id).create({
      type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
    })
    const repo = new VehicleFixedCostRepository(testDb, tenantA.id)

    await expect(
      repo.add({ vehicleId: vehicleB.id, name: '車體險', amount: 4793, month: '2026-06' })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/lib/repositories/vehicle-fixed-cost-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement VehicleFixedCostRepository**

```typescript
// src/lib/repositories/vehicle-fixed-cost-repository.ts
import type { PrismaClient, VehicleFixedCost } from '@prisma/client'

export class VehicleFixedCostRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  async add(input: {
    vehicleId: string
    name: string
    amount: number
    month: string
  }): Promise<VehicleFixedCost> {
    const vehicle = await this.db.vehicle.findUnique({ where: { id: input.vehicleId } })
    if (!vehicle || vehicle.tenantId !== this.tenantId) {
      throw new Error(`Vehicle ${input.vehicleId} not found in tenant ${this.tenantId}`)
    }

    return this.db.vehicleFixedCost.create({
      data: {
        tenantId: this.tenantId,
        vehicleId: input.vehicleId,
        name: input.name,
        amount: input.amount,
        month: input.month,
      },
    })
  }

  listForVehicleMonth(vehicleId: string, month: string): Promise<VehicleFixedCost[]> {
    return this.db.vehicleFixedCost.findMany({
      where: { tenantId: this.tenantId, vehicleId, month },
    })
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/lib/repositories/vehicle-fixed-cost-repository.test.ts`
Expected: `3 passed`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/repositories/vehicle-repository.ts src/lib/repositories/vehicle-fixed-cost-repository.ts tests/lib/repositories/vehicle-repository.test.ts tests/lib/repositories/vehicle-fixed-cost-repository.test.ts
git commit -m "feat: add VehicleRepository and VehicleFixedCostRepository"
```

---

### Task 7: ClientRepository

**Files:**
- Create: `src/lib/repositories/client-repository.ts`
- Test: `tests/lib/repositories/client-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/repositories/client-repository.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { ClientRepository } from '@/lib/repositories/client-repository'

describe('ClientRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates and lists clients scoped to a tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const repo = new ClientRepository(testDb, tenant.id)

    await repo.create({ name: '長榮旅行社', phone: '02-1234-5678' })
    const clients = await repo.list()

    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe('長榮旅行社')
  })

  it('does not leak clients across tenants', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    await new ClientRepository(testDb, tenantB.id).create({ name: 'B-client' })

    const clientsForA = await new ClientRepository(testDb, tenantA.id).list()

    expect(clientsForA).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/repositories/client-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/repositories/client-repository.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/repositories/client-repository.test.ts`
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/client-repository.ts tests/lib/repositories/client-repository.test.ts
git commit -m "feat: add tenant-scoped ClientRepository"
```

---

### Task 8: Deterministic client color-tag function

**Files:**
- Create: `src/lib/color-tag.ts`
- Test: `tests/lib/color-tag.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/color-tag.test.ts
import { describe, it, expect } from 'vitest'
import { colorTagForClient, COLOR_PALETTE } from '@/lib/color-tag'

describe('colorTagForClient', () => {
  it('always returns the same color for the same client id', () => {
    const first = colorTagForClient('client-abc-123')
    const second = colorTagForClient('client-abc-123')
    expect(first).toBe(second)
  })

  it('returns a color from the defined palette', () => {
    const color = colorTagForClient('client-abc-123')
    expect(COLOR_PALETTE).toContain(color)
  })

  it('spreads different client ids across different colors', () => {
    const colors = new Set(
      ['client-1', 'client-2', 'client-3', 'client-4', 'client-5', 'client-6'].map(colorTagForClient)
    )
    expect(colors.size).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/color-tag.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/color-tag.ts
export const COLOR_PALETTE = [
  '#ffe9a8', // yellow
  '#c9f0d0', // green
  '#ffd0e0', // pink
  '#c8def0', // blue
  '#e6d5f7', // purple
  '#ffd9b8', // orange
] as const

export type ColorTag = (typeof COLOR_PALETTE)[number]

export function colorTagForClient(clientId: string): ColorTag {
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/color-tag.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/color-tag.ts tests/lib/color-tag.test.ts
git commit -m "feat: add deterministic client color-tag function"
```

---

### Task 9: TripRepository — creation with auto-attached vehicle, status transitions

**Files:**
- Create: `src/lib/repositories/trip-repository.ts`
- Test: `tests/lib/repositories/trip-repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/repositories/trip-repository.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'

async function seedTenantWithDriverAndVehicle(tenantId: string) {
  const vehicle = await new VehicleRepository(testDb, tenantId).create({
    type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
  })
  const driver = await new DriverRepository(testDb, tenantId).create({ name: '志偉' })
  await new DriverRepository(testDb, tenantId).setDefaultVehicle(driver.id, vehicle.id)
  return { driver, vehicle }
}

describe('TripRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates a trip and auto-attaches the driver\'s default vehicle', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver, vehicle } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)

    const trip = await repo.create({
      startDate: new Date('2026-07-26'),
      endDate: new Date('2026-07-26'),
      routeDescription: '台北阿里山',
      passengerCount: 20,
      clientId: client.id,
      bookedById: booker.id,
      driverId: driver.id,
    })

    expect(trip.vehicleId).toBe(vehicle.id)
    expect(trip.status).toBe('PENDING')
  })

  it('throws if the driver has no default vehicle bound', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '無車司機' })
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)

    await expect(
      repo.create({
        startDate: new Date('2026-07-26'),
        endDate: new Date('2026-07-26'),
        routeDescription: '台北阿里山',
        passengerCount: 20,
        clientId: client.id,
        bookedById: booker.id,
        driverId: driver.id,
      })
    ).rejects.toThrow(/default vehicle/)
  })

  it('lists trips overlapping a date range for a driver, including multi-day trips', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-28'),
      routeDescription: '花蓮三日', passengerCount: 20,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })

    const trips = await repo.listOverlappingRange(
      new Date('2026-07-27'), new Date('2026-07-27')
    )

    expect(trips).toHaveLength(1)
    expect(trips[0].routeDescription).toBe('花蓮三日')
  })

  it('transitions status from PENDING to CONFIRMED', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    const trip = await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })

    const updated = await repo.transitionStatus(trip.id, 'CONFIRMED')

    expect(updated.status).toBe('CONFIRMED')
  })

  it('rejects an illegal status transition from COMPLETED to PENDING', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const { driver } = await seedTenantWithDriverAndVehicle(tenant.id)
    const client = await new ClientRepository(testDb, tenant.id).create({ name: '長榮旅行社' })
    const booker = await testDb.user.create({
      data: {
        tenantId: tenant.id, email: 'dispatcher@test.com', passwordHash: 'x',
        name: '調度員', role: 'DISPATCHER',
      },
    })
    const repo = new TripRepository(testDb, tenant.id)
    const trip = await repo.create({
      startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
      routeDescription: '台北一日', passengerCount: 10,
      clientId: client.id, bookedById: booker.id, driverId: driver.id,
    })
    await repo.transitionStatus(trip.id, 'CONFIRMED')
    await repo.transitionStatus(trip.id, 'COMPLETED')

    await expect(repo.transitionStatus(trip.id, 'PENDING')).rejects.toThrow(/transition/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/repositories/trip-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/repositories/trip-repository.ts
import type { PrismaClient, Trip, TripStatus } from '@prisma/client'

const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
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
    routeDescription: string
    passengerCount: number
    clientId: string
    bookedById: string
    driverId: string
  }): Promise<Trip> {
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

  async transitionStatus(tripId: string, nextStatus: TripStatus): Promise<Trip> {
    const trip = await this.findById(tripId)
    if (!trip) throw new Error(`Trip ${tripId} not found in tenant ${this.tenantId}`)

    if (!ALLOWED_TRANSITIONS[trip.status].includes(nextStatus)) {
      throw new Error(`Illegal transition from ${trip.status} to ${nextStatus}`)
    }

    return this.db.trip.update({ where: { id: tripId }, data: { status: nextStatus } })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/repositories/trip-repository.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/trip-repository.ts tests/lib/repositories/trip-repository.test.ts
git commit -m "feat: add TripRepository with vehicle auto-attach and status transitions"
```

---

### Task 10: TripLineItemRepository

**Files:**
- Create: `src/lib/repositories/trip-line-item-repository.ts`
- Test: `tests/lib/repositories/trip-line-item-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/repositories/trip-line-item-repository.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { VehicleRepository } from '@/lib/repositories/vehicle-repository'
import { ClientRepository } from '@/lib/repositories/client-repository'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { TripLineItemRepository } from '@/lib/repositories/trip-line-item-repository'

async function seedTrip(tenantId: string) {
  const vehicle = await new VehicleRepository(testDb, tenantId).create({
    type: '大巴', plateNumber: 'KKA-9217', capacity: 45,
  })
  const driver = await new DriverRepository(testDb, tenantId).create({ name: '志偉' })
  await new DriverRepository(testDb, tenantId).setDefaultVehicle(driver.id, vehicle.id)
  const client = await new ClientRepository(testDb, tenantId).create({ name: '長榮旅行社' })
  const booker = await testDb.user.create({
    data: {
      tenantId, email: 'dispatcher@test.com', passwordHash: 'x',
      name: '調度員', role: 'DISPATCHER',
    },
  })
  return new TripRepository(testDb, tenantId).create({
    startDate: new Date('2026-07-26'), endDate: new Date('2026-07-26'),
    routeDescription: '台北一日', passengerCount: 10,
    clientId: client.id, bookedById: booker.id, driverId: driver.id,
  })
}

describe('TripLineItemRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('adds revenue and cost line items to a trip', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const trip = await seedTrip(tenant.id)
    const repo = new TripLineItemRepository(testDb, tenant.id)

    await repo.add({ tripId: trip.id, type: 'REVENUE', name: '車資', amount: 8000 })
    await repo.add({ tripId: trip.id, type: 'COST', name: '油資', amount: 2500 })

    const items = await repo.listForTrip(trip.id)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.name)).toEqual(expect.arrayContaining(['車資', '油資']))
  })

  it('rejects adding a line item to a trip from another tenant', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const tripB = await seedTrip(tenantB.id)
    const repo = new TripLineItemRepository(testDb, tenantA.id)

    await expect(
      repo.add({ tripId: tripB.id, type: 'REVENUE', name: '車資', amount: 8000 })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/repositories/trip-line-item-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/repositories/trip-line-item-repository.ts
import type { PrismaClient, TripLineItem, LineItemType } from '@prisma/client'

export class TripLineItemRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  async add(input: {
    tripId: string
    type: LineItemType
    name: string
    amount: number
  }): Promise<TripLineItem> {
    const trip = await this.db.trip.findUnique({ where: { id: input.tripId } })
    if (!trip || trip.tenantId !== this.tenantId) {
      throw new Error(`Trip ${input.tripId} not found in tenant ${this.tenantId}`)
    }

    return this.db.tripLineItem.create({
      data: {
        tenantId: this.tenantId,
        tripId: input.tripId,
        type: input.type,
        name: input.name,
        amount: input.amount,
      },
    })
  }

  listForTrip(tripId: string): Promise<TripLineItem[]> {
    return this.db.tripLineItem.findMany({
      where: { tenantId: this.tenantId, tripId },
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/repositories/trip-line-item-repository.test.ts`
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/trip-line-item-repository.ts tests/lib/repositories/trip-line-item-repository.test.ts
git commit -m "feat: add TripLineItemRepository"
```

---

### Task 11: Calendar view builder (pure function — the core spec requirement)

This implements the two calendar views agreed with the user, including how a multi-day trip spans both.

**Files:**
- Create: `src/lib/calendar/build-calendar-view.ts`
- Test: `tests/lib/calendar/build-calendar-view.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/calendar/build-calendar-view.test.ts
import { describe, it, expect } from 'vitest'
import { buildDriverColumnView, buildMonthView, type CalendarTrip } from '@/lib/calendar/build-calendar-view'

const multiDayTrip: CalendarTrip = {
  id: 'trip-1',
  driverId: 'driver-1',
  driverName: '志偉',
  routeDescription: '花蓮三日',
  startDate: new Date('2026-07-26'),
  endDate: new Date('2026-07-28'),
  colorTag: '#ffe9a8',
}

const oneDayTrip: CalendarTrip = {
  id: 'trip-2',
  driverId: 'driver-2',
  driverName: '生哥',
  routeDescription: '台北一日',
  startDate: new Date('2026-07-27'),
  endDate: new Date('2026-07-27'),
  colorTag: '#c9f0d0',
}

describe('buildDriverColumnView', () => {
  it('places a one-day trip in exactly one cell', () => {
    const view = buildDriverColumnView([oneDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const cellsWithTrip = view.rows.flatMap((row) =>
      row.cells.filter((cell) => cell.trips.some((t) => t.tripId === 'trip-2'))
    )
    expect(cellsWithTrip).toHaveLength(1)
  })

  it('spans a multi-day trip across every date row it covers, for the same driver column', () => {
    const view = buildDriverColumnView([multiDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const cellsWithTrip = view.rows.flatMap((row) =>
      row.cells.filter((cell) => cell.trips.some((t) => t.tripId === 'trip-1'))
    )
    expect(cellsWithTrip).toHaveLength(3)
    expect(cellsWithTrip.every((cell) => cell.driverId === 'driver-1')).toBe(true)
  })

  it('marks day-index within a multi-day span (1/3, 2/3, 3/3)', () => {
    const view = buildDriverColumnView([multiDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const dayLabels = view.rows
      .flatMap((row) => row.cells)
      .flatMap((cell) => cell.trips)
      .filter((t) => t.tripId === 'trip-1')
      .map((t) => `${t.dayIndex}/${t.totalDays}`)
      .sort()

    expect(dayLabels).toEqual(['1/3', '2/3', '3/3'])
  })
})

describe('buildMonthView', () => {
  it('lists a multi-day trip on every date it covers', () => {
    const view = buildMonthView([multiDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const daysWithTrip = view.days.filter((day) =>
      day.trips.some((t) => t.tripId === 'trip-1')
    )
    expect(daysWithTrip).toHaveLength(3)
  })

  it('lists multiple trips on the same day if they overlap', () => {
    const view = buildMonthView([multiDayTrip, oneDayTrip], {
      rangeStart: new Date('2026-07-26'),
      rangeEnd: new Date('2026-07-28'),
    })

    const july27 = view.days.find((d) => d.date.toISOString().slice(0, 10) === '2026-07-27')
    expect(july27?.trips).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/calendar/build-calendar-view.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/calendar/build-calendar-view.ts
export interface CalendarTrip {
  id: string
  driverId: string
  driverName: string
  routeDescription: string
  startDate: Date
  endDate: Date
  colorTag: string
}

export interface DateRange {
  rangeStart: Date
  rangeEnd: Date
}

interface TripOccurrence {
  tripId: string
  routeDescription: string
  colorTag: string
  dayIndex: number
  totalDays: number
}

interface DriverColumnCell {
  driverId: string
  trips: TripOccurrence[]
}

interface DriverColumnRow {
  date: Date
  cells: DriverColumnCell[]
}

interface DriverColumnView {
  drivers: { driverId: string; driverName: string }[]
  rows: DriverColumnRow[]
}

interface MonthViewDay {
  date: Date
  trips: (TripOccurrence & { driverId: string; driverName: string })[]
}

interface MonthView {
  days: MonthViewDay[]
}

function eachDate(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function daysInTrip(trip: CalendarTrip): Date[] {
  return eachDate(trip.startDate, trip.endDate)
}

function occurrenceFor(trip: CalendarTrip, date: Date): TripOccurrence {
  const tripDays = daysInTrip(trip)
  const totalDays = tripDays.length
  const dayIndex = tripDays.findIndex((d) => d.toDateString() === date.toDateString()) + 1
  return {
    tripId: trip.id,
    routeDescription: trip.routeDescription,
    colorTag: trip.colorTag,
    dayIndex,
    totalDays,
  }
}

function tripOverlapsRange(trip: CalendarTrip, range: DateRange): boolean {
  return trip.startDate <= range.rangeEnd && trip.endDate >= range.rangeStart
}

export function buildDriverColumnView(trips: CalendarTrip[], range: DateRange): DriverColumnView {
  const relevantTrips = trips.filter((t) => tripOverlapsRange(t, range))
  const drivers = Array.from(
    new Map(relevantTrips.map((t) => [t.driverId, { driverId: t.driverId, driverName: t.driverName }])).values()
  )
  const rangeDates = eachDate(range.rangeStart, range.rangeEnd)

  const rows: DriverColumnRow[] = rangeDates.map((date) => ({
    date,
    cells: drivers.map((driver) => ({
      driverId: driver.driverId,
      trips: relevantTrips
        .filter((t) => t.driverId === driver.driverId && daysInTrip(t).some((d) => d.toDateString() === date.toDateString()))
        .map((t) => occurrenceFor(t, date)),
    })),
  }))

  return { drivers, rows }
}

export function buildMonthView(trips: CalendarTrip[], range: DateRange): MonthView {
  const relevantTrips = trips.filter((t) => tripOverlapsRange(t, range))
  const rangeDates = eachDate(range.rangeStart, range.rangeEnd)

  const days: MonthViewDay[] = rangeDates.map((date) => ({
    date,
    trips: relevantTrips
      .filter((t) => daysInTrip(t).some((d) => d.toDateString() === date.toDateString()))
      .map((t) => ({ ...occurrenceFor(t, date), driverId: t.driverId, driverName: t.driverName })),
  }))

  return { days }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/calendar/build-calendar-view.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar tests/lib/calendar
git commit -m "feat: add pure calendar view builder for driver-column and month views"
```

---

### Task 12: Settlement calculation (pure function — the other core spec requirement)

Implements: sum revenue/cost line items for a driver's COMPLETED trips in a month + that driver's vehicle's fixed costs for the month, with the cross-month rule (a trip counts toward the month of its `startDate` even if it ends in the next month).

**Files:**
- Create: `src/lib/settlement/calculate-settlement.ts`
- Test: `tests/lib/settlement/calculate-settlement.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/settlement/calculate-settlement.test.ts
import { describe, it, expect } from 'vitest'
import { calculateSettlement, type SettlementTrip, type SettlementFixedCost } from '@/lib/settlement/calculate-settlement'

describe('calculateSettlement', () => {
  it('sums revenue and cost line items for completed trips in the target month', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-07-05'), status: 'COMPLETED',
        lineItems: [
          { type: 'REVENUE', amount: 8000 },
          { type: 'COST', amount: 2500 },
        ],
      },
    ]

    const result = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })

    expect(result.totalRevenue).toBe(8000)
    expect(result.totalCost).toBe(2500)
    expect(result.payableAmount).toBe(5500)
  })

  it('excludes trips not in the target month', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-06-30'), status: 'COMPLETED',
        lineItems: [{ type: 'REVENUE', amount: 8000 }],
      },
    ]

    const result = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })

    expect(result.totalRevenue).toBe(0)
  })

  it('excludes trips that are not COMPLETED', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-07-05'), status: 'CONFIRMED',
        lineItems: [{ type: 'REVENUE', amount: 8000 }],
      },
    ]

    const result = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })

    expect(result.totalRevenue).toBe(0)
  })

  it('counts a trip that spans a month boundary toward its start-date month', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-07-30'), status: 'COMPLETED',
        lineItems: [{ type: 'REVENUE', amount: 18000 }],
      },
    ]

    const julyResult = calculateSettlement({ trips, fixedCosts: [], month: '2026-07' })
    const augustResult = calculateSettlement({ trips, fixedCosts: [], month: '2026-08' })

    expect(julyResult.totalRevenue).toBe(18000)
    expect(augustResult.totalRevenue).toBe(0)
  })

  it('subtracts vehicle fixed costs from the payable amount', () => {
    const trips: SettlementTrip[] = [
      {
        id: 'trip-1', startDate: new Date('2026-06-01'), status: 'COMPLETED',
        lineItems: [{ type: 'REVENUE', amount: 10000 }],
      },
    ]
    const fixedCosts: SettlementFixedCost[] = [
      { name: '車體險', amount: 4793 },
      { name: '常年會費', amount: 3000 },
    ]

    const result = calculateSettlement({ trips, fixedCosts, month: '2026-06' })

    expect(result.totalCost).toBe(7793)
    expect(result.payableAmount).toBe(2207)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/settlement/calculate-settlement.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/settlement/calculate-settlement.ts
export interface SettlementTrip {
  id: string
  startDate: Date
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  lineItems: { type: 'REVENUE' | 'COST'; amount: number }[]
}

export interface SettlementFixedCost {
  name: string
  amount: number
}

export interface SettlementResult {
  totalRevenue: number
  totalCost: number
  payableAmount: number
}

function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function calculateSettlement(input: {
  trips: SettlementTrip[]
  fixedCosts: SettlementFixedCost[]
  month: string
}): SettlementResult {
  const tripsInMonth = input.trips.filter(
    (trip) => trip.status === 'COMPLETED' && monthOf(trip.startDate) === input.month
  )

  const tripRevenue = tripsInMonth
    .flatMap((t) => t.lineItems)
    .filter((li) => li.type === 'REVENUE')
    .reduce((sum, li) => sum + li.amount, 0)

  const tripCost = tripsInMonth
    .flatMap((t) => t.lineItems)
    .filter((li) => li.type === 'COST')
    .reduce((sum, li) => sum + li.amount, 0)

  const fixedCostTotal = input.fixedCosts.reduce((sum, c) => sum + c.amount, 0)

  const totalRevenue = tripRevenue
  const totalCost = tripCost + fixedCostTotal

  return {
    totalRevenue,
    totalCost,
    payableAmount: totalRevenue - totalCost,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/settlement/calculate-settlement.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settlement tests/lib/settlement
git commit -m "feat: add pure settlement calculation with month-boundary rule"
```

---

### Task 13: SettlementRepository — persist generated settlements

**Files:**
- Create: `src/lib/repositories/settlement-repository.ts`
- Test: `tests/lib/repositories/settlement-repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/repositories/settlement-repository.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { SettlementRepository } from '@/lib/repositories/settlement-repository'

describe('SettlementRepository', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('generates and persists a settlement for a driver and month', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)

    const settlement = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })

    expect(settlement.status).toBe('GENERATED')
    expect(Number(settlement.payableAmount)).toBe(5500)
  })

  it('regenerating for the same driver and month overwrites the previous draft', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)
    await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })

    const regenerated = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 9000, totalCost: 2500, payableAmount: 6500,
    })

    expect(Number(regenerated.payableAmount)).toBe(6500)
    const all = await repo.listForDriver(driver.id)
    expect(all).toHaveLength(1)
  })

  it('marks a settlement as paid', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const driver = await new DriverRepository(testDb, tenant.id).create({ name: '志偉' })
    const repo = new SettlementRepository(testDb, tenant.id)
    const settlement = await repo.generate({
      driverId: driver.id, month: '2026-07',
      totalRevenue: 8000, totalCost: 2500, payableAmount: 5500,
    })

    const paid = await repo.markPaid(settlement.id)

    expect(paid.status).toBe('PAID')
    expect(paid.paidAt).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/repositories/settlement-repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/repositories/settlement-repository.ts
import type { PrismaClient, SettlementRecord } from '@prisma/client'

export class SettlementRepository {
  constructor(private readonly db: PrismaClient, private readonly tenantId: string) {}

  generate(input: {
    driverId: string
    month: string
    totalRevenue: number
    totalCost: number
    payableAmount: number
  }): Promise<SettlementRecord> {
    return this.db.settlementRecord.upsert({
      where: {
        tenantId_driverId_month: {
          tenantId: this.tenantId, driverId: input.driverId, month: input.month,
        },
      },
      create: {
        tenantId: this.tenantId,
        driverId: input.driverId,
        month: input.month,
        totalRevenue: input.totalRevenue,
        totalCost: input.totalCost,
        payableAmount: input.payableAmount,
        status: 'GENERATED',
      },
      update: {
        totalRevenue: input.totalRevenue,
        totalCost: input.totalCost,
        payableAmount: input.payableAmount,
        status: 'GENERATED',
        paidAt: null,
      },
    })
  }

  listForDriver(driverId: string): Promise<SettlementRecord[]> {
    return this.db.settlementRecord.findMany({
      where: { tenantId: this.tenantId, driverId },
      orderBy: { month: 'desc' },
    })
  }

  async markPaid(settlementId: string): Promise<SettlementRecord> {
    const settlement = await this.db.settlementRecord.findUnique({ where: { id: settlementId } })
    if (!settlement || settlement.tenantId !== this.tenantId) {
      throw new Error(`Settlement ${settlementId} not found in tenant ${this.tenantId}`)
    }

    return this.db.settlementRecord.update({
      where: { id: settlementId },
      data: { status: 'PAID', paidAt: new Date() },
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/repositories/settlement-repository.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/settlement-repository.ts tests/lib/repositories/settlement-repository.test.ts
git commit -m "feat: add SettlementRepository with upsert-by-month and mark-paid"
```

---

### Task 14: Operations overview (monthly P&L rollup, tenant-scoped and platform-wide)

**Files:**
- Create: `src/lib/overview/build-operations-overview.ts`
- Test: `tests/lib/overview/build-operations-overview.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/overview/build-operations-overview.test.ts
import { describe, it, expect } from 'vitest'
import { buildOperationsOverview, type OverviewSettlement } from '@/lib/overview/build-operations-overview'

describe('buildOperationsOverview', () => {
  it('rolls up total revenue, cost and profit per month across all drivers', () => {
    const settlements: OverviewSettlement[] = [
      { month: '2026-06', totalRevenue: 10000, totalCost: 4000 },
      { month: '2026-06', totalRevenue: 8000, totalCost: 3000 },
      { month: '2026-07', totalRevenue: 5000, totalCost: 2000 },
    ]

    const overview = buildOperationsOverview(settlements)

    expect(overview).toEqual([
      { month: '2026-06', totalRevenue: 18000, totalCost: 7000, netProfit: 11000 },
      { month: '2026-07', totalRevenue: 5000, totalCost: 2000, netProfit: 3000 },
    ])
  })

  it('returns months sorted chronologically ascending', () => {
    const settlements: OverviewSettlement[] = [
      { month: '2026-07', totalRevenue: 100, totalCost: 0 },
      { month: '2026-01', totalRevenue: 200, totalCost: 0 },
    ]

    const overview = buildOperationsOverview(settlements)

    expect(overview.map((o) => o.month)).toEqual(['2026-01', '2026-07'])
  })

  it('returns an empty array for no settlements', () => {
    expect(buildOperationsOverview([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/overview/build-operations-overview.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/overview/build-operations-overview.ts
export interface OverviewSettlement {
  month: string
  totalRevenue: number
  totalCost: number
}

export interface MonthlyOverview {
  month: string
  totalRevenue: number
  totalCost: number
  netProfit: number
}

export function buildOperationsOverview(settlements: OverviewSettlement[]): MonthlyOverview[] {
  const byMonth = new Map<string, { totalRevenue: number; totalCost: number }>()

  for (const s of settlements) {
    const existing = byMonth.get(s.month) ?? { totalRevenue: 0, totalCost: 0 }
    byMonth.set(s.month, {
      totalRevenue: existing.totalRevenue + s.totalRevenue,
      totalCost: existing.totalCost + s.totalCost,
    })
  }

  return Array.from(byMonth.entries())
    .map(([month, totals]) => ({
      month,
      totalRevenue: totals.totalRevenue,
      totalCost: totals.totalCost,
      netProfit: totals.totalRevenue - totals.totalCost,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/overview/build-operations-overview.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/overview tests/lib/overview
git commit -m "feat: add operations overview monthly P&L rollup"
```

---

### Task 15: RBAC guard

**Files:**
- Create: `src/lib/rbac.ts`
- Test: `tests/lib/rbac.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/rbac.test.ts
import { describe, it, expect } from 'vitest'
import { requireRole, ForbiddenError, type SessionUser } from '@/lib/rbac'

const dispatcher: SessionUser = { id: 'u1', role: 'DISPATCHER', tenantId: 't1' }
const accountant: SessionUser = { id: 'u2', role: 'ACCOUNTANT', tenantId: 't1' }
const superadmin: SessionUser = { id: 'u3', role: 'SUPERADMIN', tenantId: null }

describe('requireRole', () => {
  it('allows a user whose role is in the allowed list', () => {
    expect(() => requireRole(dispatcher, ['DISPATCHER', 'TENANT_ADMIN'])).not.toThrow()
  })

  it('throws ForbiddenError for a user whose role is not allowed', () => {
    expect(() => requireRole(accountant, ['DISPATCHER', 'TENANT_ADMIN'])).toThrow(ForbiddenError)
  })

  it('always allows SUPERADMIN regardless of the allowed list', () => {
    expect(() => requireRole(superadmin, ['ACCOUNTANT'])).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/rbac.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/rbac.ts
export type Role = 'SUPERADMIN' | 'TENANT_ADMIN' | 'DISPATCHER' | 'ACCOUNTANT' | 'DRIVER'

export interface SessionUser {
  id: string
  role: Role
  tenantId: string | null
}

export class ForbiddenError extends Error {
  constructor(role: Role) {
    super(`Role ${role} is not permitted to perform this action`)
    this.name = 'ForbiddenError'
  }
}

export function requireRole(user: SessionUser, allowed: Role[]): void {
  if (user.role === 'SUPERADMIN') return
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(user.role)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/rbac.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac.ts tests/lib/rbac.test.ts
git commit -m "feat: add role-based access guard"
```

---

### Task 16: Auth.js configuration with typed session

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/types/next-auth.d.ts`

- [ ] **Step 1: Install Auth.js**

Run: `npm install next-auth@beta`

- [ ] **Step 2: Extend the session type**

```typescript
// src/types/next-auth.d.ts
import type { Role } from '@/lib/rbac'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      tenantId: string | null
      name: string
      email: string
    }
  }
}
```

- [ ] **Step 3: Write the Auth.js config**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub as string
      session.user.role = token.role as any
      session.user.tenantId = token.tenantId as string | null
      return session
    },
  },
  pages: { signIn: '/login' },
})
```

- [ ] **Step 4: Wire the API route handler**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 5: Manual verification (no automated test — this wires a third-party library)**

Run: `npm run build`
Expected: build succeeds with no type errors referencing `@/lib/auth` or `next-auth.d.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth src/types/next-auth.d.ts package.json package-lock.json
git commit -m "feat: configure Auth.js with credentials provider and typed session"
```

---

### Task 17: Seed script — test tenant with all five roles and sample data

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Install ts-node for the seed script**

Run: `npm install -D ts-node`

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/seed.ts"
}
```

- [ ] **Step 2: Write the seed script**

```typescript
// scripts/seed.ts
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const db = new PrismaClient()

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
```

- [ ] **Step 3: Run the seed script against the dev database**

Run: `npx prisma db seed`
Expected: `Seed complete. Test tenant: <id>` printed, no errors.

- [ ] **Step 4: Verify the data landed**

Run: `npx prisma studio` (or a quick query) — confirm 5 `User` rows, 1 `Tenant`, 1 `Vehicle`, 1 `Driver`, 1 `Client` exist for `測試車行`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts package.json package-lock.json
git commit -m "feat: add seed script for test tenant with all five roles"
```

---

### Task 18: API routes — drivers, vehicles, clients, trips, line items, calendar, settlements, overview

Each route follows the same shape: read the session via `auth()`, call `requireRole`, instantiate the relevant repository with `session.user.tenantId`, call it, return JSON. Written as one task since the routes are thin and structurally identical — see the driver route in full below; the rest follow verbatim with the entity name swapped.

**Files:**
- Create: `src/app/api/drivers/route.ts`
- Create: `src/app/api/vehicles/route.ts`
- Create: `src/app/api/clients/route.ts`
- Create: `src/app/api/trips/route.ts`
- Create: `src/app/api/trips/[tripId]/line-items/route.ts`
- Create: `src/app/api/calendar/route.ts`
- Create: `src/app/api/settlements/route.ts`
- Create: `src/app/api/overview/route.ts`
- Test: `tests/app/api/drivers.test.ts`

- [ ] **Step 1: Write the failing integration test for the drivers route logic**

Route handlers in Next.js App Router are thin wrappers; to keep this testable without spinning up an HTTP server, the route delegates to an exported handler function that takes the session directly.

```typescript
// tests/app/api/drivers.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../../support/test-db'
import { listDrivers, createDriver } from '@/app/api/drivers/handlers'

describe('drivers API handlers', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('creates and lists drivers for the caller\'s tenant', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u1', role: 'DISPATCHER' as const, tenantId: tenant.id }

    await createDriver(testDb, session, { name: '志偉', phone: '0912345678' })
    const drivers = await listDrivers(testDb, session)

    expect(drivers).toHaveLength(1)
    expect(drivers[0].name).toBe('志偉')
  })

  it('rejects driver creation from a DRIVER-role session', async () => {
    const tenant = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const session = { id: 'u2', role: 'DRIVER' as const, tenantId: tenant.id }

    await expect(
      createDriver(testDb, session, { name: '志偉' })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/api/drivers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the handlers module and the route wrapper**

```typescript
// src/app/api/drivers/handlers.ts
import type { PrismaClient } from '@prisma/client'
import { DriverRepository } from '@/lib/repositories/driver-repository'
import { requireRole, type SessionUser } from '@/lib/rbac'

export async function listDrivers(db: PrismaClient, session: SessionUser) {
  requireRole(session, ['TENANT_ADMIN', 'DISPATCHER', 'ACCOUNTANT'])
  return new DriverRepository(db, session.tenantId!).list()
}

export async function createDriver(
  db: PrismaClient,
  session: SessionUser,
  input: { name: string; phone?: string }
) {
  requireRole(session, ['TENANT_ADMIN'])
  return new DriverRepository(db, session.tenantId!).create(input)
}
```

```typescript
// src/app/api/drivers/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { listDrivers, createDriver } from './handlers'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const drivers = await listDrivers(db, session.user)
  return NextResponse.json(drivers)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const driver = await createDriver(db, session.user, body)
  return NextResponse.json(driver, { status: 201 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/app/api/drivers.test.ts`
Expected: `2 passed`.

- [ ] **Step 5: Repeat the same handlers+route shape for the remaining entities**

Create `src/app/api/vehicles/handlers.ts` + `route.ts` wrapping `VehicleRepository`, allowed roles `['TENANT_ADMIN']` for create, `['TENANT_ADMIN','DISPATCHER','ACCOUNTANT']` for list.

Create `src/app/api/clients/handlers.ts` + `route.ts` wrapping `ClientRepository`, allowed roles `['TENANT_ADMIN','DISPATCHER']` for create, `['TENANT_ADMIN','DISPATCHER','ACCOUNTANT']` for list.

Create `src/app/api/trips/handlers.ts` + `route.ts` wrapping `TripRepository`, allowed roles `['TENANT_ADMIN','DISPATCHER']` for create, `['TENANT_ADMIN','DISPATCHER','ACCOUNTANT']` for list — for `DRIVER` role, filter `listOverlappingRange` results to `trip.driverId === session.driverId` (requires joining `Driver.userId` to the session user; add a `findDriverIdForUser` lookup in `DriverRepository` before wiring this branch).

Create `src/app/api/trips/[tripId]/line-items/handlers.ts` + `route.ts` wrapping `TripLineItemRepository`, allowed roles `['TENANT_ADMIN','DISPATCHER','ACCOUNTANT']`.

Create `src/app/api/calendar/handlers.ts` + `route.ts`: reads query params `rangeStart`/`rangeEnd`/`view` (`'driver-column' | 'month'`), loads trips via `TripRepository.listOverlappingRange`, maps them to `CalendarTrip[]` (joining driver name and `colorTagForClient(clientId)`), and calls `buildDriverColumnView` or `buildMonthView` accordingly. Allowed roles: all five (DRIVER sees only their own trips, same filter as above).

Create `src/app/api/settlements/handlers.ts` + `route.ts`: `POST` generates a settlement (loads the driver's COMPLETED trips + line items for the month via `TripRepository`/`TripLineItemRepository`, loads the driver's default vehicle's `VehicleFixedCostRepository.listForVehicleMonth`, runs `calculateSettlement`, persists via `SettlementRepository.generate`). Allowed roles `['TENANT_ADMIN','ACCOUNTANT']`. `PATCH` marks paid, same roles. `GET` lists, adds `['DRIVER']` filtered to the caller's own driver record.

Create `src/app/api/overview/handlers.ts` + `route.ts`: loads all `SettlementRecord`s for the tenant (or, for `SUPERADMIN`, across all tenants via a separate `platform-queries.ts` module — see Task 19), maps to `OverviewSettlement[]`, calls `buildOperationsOverview`. Allowed roles `['TENANT_ADMIN','ACCOUNTANT','SUPERADMIN']`.

Each of these follows the exact test-then-implement shape from Steps 1–4 above; write one `tests/app/api/<entity>.test.ts` per route before implementing it, mirroring the drivers test's structure (one "happy path scoped to tenant" case, one "role rejected" case, plus any entity-specific business rule from its repository).

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api
git commit -m "feat: add API routes for drivers, vehicles, clients, trips, line items, calendar, settlements, overview"
```

---

### Task 19: Platform-wide queries module for superadmin (explicitly separate from tenant-scoped code)

**Files:**
- Create: `src/lib/platform-queries.ts`
- Test: `tests/lib/platform-queries.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/platform-queries.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, resetTestDb } from '../support/test-db'
import { listAllTenantsSettlements } from '@/lib/platform-queries'

describe('platform-queries', () => {
  beforeEach(resetTestDb)
  afterAll(async () => testDb.$disconnect())

  it('returns settlements across every tenant, unscoped', async () => {
    const tenantA = await testDb.tenant.create({ data: { name: 'Tiger Bus' } })
    const tenantB = await testDb.tenant.create({ data: { name: 'Other Bus Co' } })
    const driverA = await testDb.driver.create({ data: { tenantId: tenantA.id, name: 'A-driver' } })
    const driverB = await testDb.driver.create({ data: { tenantId: tenantB.id, name: 'B-driver' } })
    await testDb.settlementRecord.create({
      data: {
        tenantId: tenantA.id, driverId: driverA.id, month: '2026-07',
        totalRevenue: 1000, totalCost: 200, payableAmount: 800, status: 'GENERATED',
      },
    })
    await testDb.settlementRecord.create({
      data: {
        tenantId: tenantB.id, driverId: driverB.id, month: '2026-07',
        totalRevenue: 2000, totalCost: 400, payableAmount: 1600, status: 'GENERATED',
      },
    })

    const all = await listAllTenantsSettlements(testDb)

    expect(all).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/platform-queries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/platform-queries.ts
// SUPERADMIN-ONLY MODULE. Every function here queries across all tenants
// with no tenantId filter. Do not import this from tenant-facing code paths —
// only from handlers that have already verified session.user.role === 'SUPERADMIN'.
import type { PrismaClient, SettlementRecord } from '@prisma/client'

export function listAllTenantsSettlements(db: PrismaClient): Promise<SettlementRecord[]> {
  return db.settlementRecord.findMany({ orderBy: [{ tenantId: 'asc' }, { month: 'asc' }] })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/platform-queries.test.ts`
Expected: `1 passed`.

- [ ] **Step 5: Wire it into the overview handler for SUPERADMIN**

Modify `src/app/api/overview/handlers.ts`: when `session.role === 'SUPERADMIN'`, call `listAllTenantsSettlements(db)` instead of the tenant-scoped settlement lookup, before mapping to `OverviewSettlement[]` and calling `buildOperationsOverview`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/platform-queries.ts tests/lib/platform-queries.test.ts src/app/api/overview/handlers.ts
git commit -m "feat: add explicit platform-wide queries module for superadmin overview"
```

---

### Task 20: Minimal UI — login, calendar (dual view), settlements

This is intentionally the leanest layer: server components fetching from the repositories directly (no need to round-trip through the API routes within the same Next.js app), styled with plain CSS modules, no design system. Forms use native HTML + server actions.

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/calendar/page.tsx`
- Create: `src/app/(dashboard)/calendar/calendar-view.tsx`
- Create: `src/app/(dashboard)/settlements/page.tsx`

- [ ] **Step 1: Login page**

```typescript
// src/app/login/page.tsx
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  return (
    <form
      action={async (formData) => {
        'use server'
        await signIn('credentials', {
          email: formData.get('email'),
          password: formData.get('password'),
          redirectTo: '/calendar',
        })
      }}
    >
      <h1>登入</h1>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        密碼
        <input name="password" type="password" required />
      </label>
      <button type="submit">登入</button>
    </form>
  )
}
```

- [ ] **Step 2: Dashboard layout with auth guard**

```typescript
// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div>
      <nav>
        <span>{session.user.name}（{session.user.role}）</span>
        <a href="/calendar">行事曆</a>
        <a href="/settlements">結算</a>
      </nav>
      <main>{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Calendar page — server component fetching + client toggle**

```typescript
// src/app/(dashboard)/calendar/page.tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { TripRepository } from '@/lib/repositories/trip-repository'
import { colorTagForClient } from '@/lib/color-tag'
import { CalendarView } from './calendar-view'
import type { CalendarTrip } from '@/lib/calendar/build-calendar-view'

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user?.tenantId) return null

  const rangeStart = new Date()
  rangeStart.setDate(1)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  rangeEnd.setDate(0)

  const tripRepo = new TripRepository(db, session.user.tenantId)
  const trips = await tripRepo.listOverlappingRange(rangeStart, rangeEnd)

  const driverIds = [...new Set(trips.map((t) => t.driverId))]
  const drivers = await db.driver.findMany({ where: { id: { in: driverIds } } })
  const driverNameById = new Map(drivers.map((d) => [d.id, d.name]))

  const calendarTrips: CalendarTrip[] = trips.map((t) => ({
    id: t.id,
    driverId: t.driverId,
    driverName: driverNameById.get(t.driverId) ?? '未知司機',
    routeDescription: t.routeDescription,
    startDate: t.startDate,
    endDate: t.endDate,
    colorTag: colorTagForClient(t.clientId),
  }))

  return (
    <CalendarView
      trips={calendarTrips}
      rangeStart={rangeStart.toISOString()}
      rangeEnd={rangeEnd.toISOString()}
    />
  )
}
```

- [ ] **Step 4: Calendar client component with view toggle**

```typescript
// src/app/(dashboard)/calendar/calendar-view.tsx
'use client'

import { useMemo, useState } from 'react'
import {
  buildDriverColumnView,
  buildMonthView,
  type CalendarTrip,
} from '@/lib/calendar/build-calendar-view'

export function CalendarView({
  trips,
  rangeStart,
  rangeEnd,
}: {
  trips: CalendarTrip[]
  rangeStart: string
  rangeEnd: string
}) {
  const [mode, setMode] = useState<'driver-column' | 'month'>('driver-column')

  const range = useMemo(
    () => ({ rangeStart: new Date(rangeStart), rangeEnd: new Date(rangeEnd) }),
    [rangeStart, rangeEnd]
  )

  const parsedTrips = useMemo(
    () => trips.map((t) => ({ ...t, startDate: new Date(t.startDate), endDate: new Date(t.endDate) })),
    [trips]
  )

  return (
    <div>
      <button onClick={() => setMode('driver-column')} disabled={mode === 'driver-column'}>
        司機為欄
      </button>
      <button onClick={() => setMode('month')} disabled={mode === 'month'}>
        月曆式
      </button>

      {mode === 'driver-column' ? (
        <DriverColumnTable trips={parsedTrips} range={range} />
      ) : (
        <MonthTable trips={parsedTrips} range={range} />
      )}
    </div>
  )
}

function DriverColumnTable({
  trips,
  range,
}: {
  trips: CalendarTrip[]
  range: { rangeStart: Date; rangeEnd: Date }
}) {
  const view = buildDriverColumnView(trips, range)
  return (
    <table>
      <thead>
        <tr>
          <th>日期</th>
          {view.drivers.map((d) => (
            <th key={d.driverId}>{d.driverName}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {view.rows.map((row) => (
          <tr key={row.date.toISOString()}>
            <td>{row.date.toLocaleDateString('zh-TW')}</td>
            {row.cells.map((cell) => (
              <td key={cell.driverId}>
                {cell.trips.map((t) => (
                  <div key={t.tripId} style={{ background: t.colorTag }}>
                    {t.routeDescription} ({t.dayIndex}/{t.totalDays})
                  </div>
                ))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MonthTable({
  trips,
  range,
}: {
  trips: CalendarTrip[]
  range: { rangeStart: Date; rangeEnd: Date }
}) {
  const view = buildMonthView(trips, range)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
      {view.days.map((day) => (
        <div key={day.date.toISOString()} style={{ border: '1px solid #ccc', minHeight: 80 }}>
          <strong>{day.date.getDate()}</strong>
          {day.trips.map((t) => (
            <div key={t.tripId} style={{ background: t.colorTag }}>
              {t.routeDescription}（{t.driverName}）第{t.dayIndex}天
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Settlements page**

```typescript
// src/app/(dashboard)/settlements/page.tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function SettlementsPage() {
  const session = await auth()
  if (!session?.user?.tenantId) return null

  const settlements = await db.settlementRecord.findMany({
    where: { tenantId: session.user.tenantId },
    include: { driver: true },
    orderBy: { month: 'desc' },
  })

  return (
    <table>
      <thead>
        <tr>
          <th>司機</th>
          <th>月份</th>
          <th>收入</th>
          <th>成本</th>
          <th>應付金額</th>
          <th>狀態</th>
        </tr>
      </thead>
      <tbody>
        {settlements.map((s) => (
          <tr key={s.id}>
            <td>{s.driver.name}</td>
            <td>{s.month}</td>
            <td>{Number(s.totalRevenue).toLocaleString()}</td>
            <td>{Number(s.totalCost).toLocaleString()}</td>
            <td>{Number(s.payableAmount).toLocaleString()}</td>
            <td>{s.status === 'PAID' ? '已付款' : '已產生'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`
Log in as `dispatcher@test-fleet.dev` / `password123` (from the seed script), navigate to `/calendar`, confirm both view toggles render without errors, then log in as `accountant@test-fleet.dev` and confirm `/settlements` renders.

- [ ] **Step 7: Commit**

```bash
git add src/app/login src/app/\(dashboard\)
git commit -m "feat: add login page, dashboard layout, calendar UI, settlements UI"
```

---

### Task 21: README with setup instructions and manual smoke test checklist

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# Tiger Bus — 巴士調度派遣管理系統

## 本機開發設置

1. `npm install`
2. `cp .env.example .env`
3. `docker compose up -d`
4. `npx prisma migrate dev`
5. `npx prisma db seed`
6. `npm run dev`

## 測試

- `npm test` 跑一次
- `npm run test:watch` 監看模式
- 測試需要 `docker compose up -d` 已啟動的 `postgres_test` 服務，且已對它跑過一次
  `DATABASE_URL="postgresql://tiger_bus:tiger_bus@localhost:5433/tiger_bus_test" npx prisma migrate deploy`

## 測試帳號（seed 後可用，密碼皆為 password123）

| 角色 | Email |
|---|---|
| Superadmin | superadmin@tigerbus.dev |
| 車行管理者 | admin@test-fleet.dev |
| 調度接單 | dispatcher@test-fleet.dev |
| 會計 | accountant@test-fleet.dev |
| 司機 | driver@test-fleet.dev |

## 手動驗收清單

- [ ] 調度接單登入，建立一趟跨天行程（開始/結束日期不同），指派司機，確認自動帶出車號
- [ ] 行事曆頁面切換「司機為欄」與「月曆式」，確認跨天行程正確橫跨顯示
- [ ] 為該行程新增收支項目（車資、油資）
- [ ] 將行程狀態轉為已完成
- [ ] 會計登入，為該司機該月產生結算單，確認金額正確
- [ ] 標記結算單已付款
- [ ] 查看營運總覽，確認該月數字反映剛才的結算
- [ ] 司機帳號登入，確認只能看到自己的班表
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add setup instructions and manual smoke test checklist"
```

---

## Self-Review Notes

**Spec coverage check:**
- Multi-tenant Tenant/User/Role model → Task 2, 15, 16
- Tenant isolation via explicit repository layer (not middleware) → Task 5 (pattern), Tasks 6/7/9/10/13 (applied), Task 19 (explicit superadmin exception)
- Driver/Vehicle separation with default-vehicle binding → Task 5, 9
- Vehicle fields (type/plate/capacity/inspection date) → Task 2, 6
- VehicleFixedCost dynamic monthly items → Task 6
- Client entity → Task 7
- Trip with start/end date, dynamic status, color tag → Task 2, 8, 9
- Dual calendar views incl. multi-day spanning and cross-view sync → Task 11, 20
- Dynamic TripLineItem revenue/cost → Task 10
- Monthly settlement incl. cross-month-boundary rule, vehicle fixed costs, manual paid marking → Task 12, 13
- Operations overview (tenant + platform-wide) → Task 14, 19
- Permission matrix → Task 15 enforced per-route in Task 18
- Explicit MVP exclusions (native app, payment gateway, self-service booking, inspection reminders, notifications) → not built; no task references them

**No gaps found.**

**Type consistency check:** `Role`, `TripStatus`, `LineItemType`, `SettlementStatus` are defined once in `prisma/schema.prisma` (Task 2) and imported from `@prisma/client` everywhere else — `src/lib/rbac.ts` (Task 15) intentionally redeclares a matching string-literal `Role` type since it must not depend on `@prisma/client` (used in pure function tests without a DB). Verified the literal values match the Prisma enum exactly.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-28-bus-dispatch-mvp.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
