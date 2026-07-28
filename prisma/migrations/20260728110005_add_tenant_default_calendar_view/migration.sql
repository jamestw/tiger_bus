-- CreateEnum
CREATE TYPE "CalendarViewMode" AS ENUM ('MONTH', 'WEEK');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "defaultCalendarView" "CalendarViewMode" NOT NULL DEFAULT 'MONTH';
