/*
  Warnings:

  - The values [NEAREST_TRANSPORT] on the enum `TransportNodeType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `nearestSpotId` on the `Transport` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransportNodeType_new" AS ENUM ('DEPARTURE', 'DESTINATION', 'SPOT');
ALTER TABLE "Transport" ALTER COLUMN "fromType" TYPE "TransportNodeType_new" USING ("fromType"::text::"TransportNodeType_new");
ALTER TABLE "Transport" ALTER COLUMN "toType" TYPE "TransportNodeType_new" USING ("toType"::text::"TransportNodeType_new");
ALTER TYPE "TransportNodeType" RENAME TO "TransportNodeType_old";
ALTER TYPE "TransportNodeType_new" RENAME TO "TransportNodeType";
DROP TYPE "public"."TransportNodeType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_nearestSpotId_fkey";

-- AlterTable
ALTER TABLE "Transport" DROP COLUMN "nearestSpotId";

-- CreateTable
CREATE TABLE "NearestStation" (
    "id" SERIAL NOT NULL,
    "spotId" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "walkingTime" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "NearestStation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NearestStation" ADD CONSTRAINT "NearestStation_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
