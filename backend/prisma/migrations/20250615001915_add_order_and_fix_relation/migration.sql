/*
  Warnings:

  - You are about to drop the column `fromLocationId` on the `Transport` table. All the data in the column will be lost.
  - You are about to drop the column `planSpotId` on the `Transport` table. All the data in the column will be lost.
  - You are about to drop the column `toLocationId` on the `Transport` table. All the data in the column will be lost.
  - Added the required column `planId` to the `Transport` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_planSpotId_fkey";

-- DropForeignKey
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_toLocationId_fkey";

-- DropIndex
DROP INDEX "PlanSpot_spotId_key";

-- AlterTable
ALTER TABLE "PlanSpot" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transport" DROP COLUMN "fromLocationId",
DROP COLUMN "planSpotId",
DROP COLUMN "toLocationId",
ADD COLUMN     "fromSpotId" INTEGER,
ADD COLUMN     "planId" INTEGER NOT NULL,
ADD COLUMN     "toSpotId" INTEGER;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_fromSpotId_fkey" FOREIGN KEY ("fromSpotId") REFERENCES "PlanSpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_toSpotId_fkey" FOREIGN KEY ("toSpotId") REFERENCES "PlanSpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
