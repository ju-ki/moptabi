/*
  Warnings:

  - You are about to drop the `NearestStation` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "TransportNodeType" ADD VALUE 'NEAREST_TRANSPORT';

-- DropForeignKey
ALTER TABLE "NearestStation" DROP CONSTRAINT "NearestStation_spotId_fkey";

-- AlterTable
ALTER TABLE "SpotMeta" ADD COLUMN     "address" VARCHAR(255),
ADD COLUMN     "prefecture" VARCHAR(50),
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "nearestSpotId" INTEGER;

-- DropTable
DROP TABLE "NearestStation";

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_nearestSpotId_fkey" FOREIGN KEY ("nearestSpotId") REFERENCES "PlanSpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
