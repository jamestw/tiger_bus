-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- CreateTable
CREATE TABLE "LineItemPreset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LineItemType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineItemPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineItemPreset_tenantId_idx" ON "LineItemPreset"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LineItemPreset_tenantId_name_type_key" ON "LineItemPreset"("tenantId", "name", "type");

-- AddForeignKey
ALTER TABLE "LineItemPreset" ADD CONSTRAINT "LineItemPreset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
