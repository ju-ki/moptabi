/*
  Warnings:

  - A unique constraint covering the columns `[spotId]` on the table `PlanSpot` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_toLocationId_fkey";

-- AlterTable
ALTER TABLE "Transport" ALTER COLUMN "fromLocationId" SET DATA TYPE TEXT,
ALTER COLUMN "toLocationId" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PlanSpot_spotId_key" ON "PlanSpot"("spotId");

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "PlanSpot"("spotId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "PlanSpot"("spotId") ON DELETE SET NULL ON UPDATE CASCADE;
