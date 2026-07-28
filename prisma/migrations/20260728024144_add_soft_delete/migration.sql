-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Client_tenantId_deletedAt_idx" ON "Client"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Driver_tenantId_deletedAt_idx" ON "Driver"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_deletedAt_idx" ON "Vehicle"("tenantId", "deletedAt");
