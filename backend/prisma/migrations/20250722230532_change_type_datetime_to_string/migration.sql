/*
  Warnings:

  - Changed the type of `date` on the `Plan` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `stayStart` to the `PlanSpot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stayEnd` to the `PlanSpot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `startDate` on the `Trip` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endDate` on the `Trip` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `TripInfo` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "date",
ADD COLUMN     "date" VARCHAR(10) NOT NULL;

-- AlterTable
ALTER TABLE "PlanSpot" DROP COLUMN "stayStart",
ADD COLUMN     "stayStart" VARCHAR(5) NOT NULL,
DROP COLUMN "stayEnd",
ADD COLUMN     "stayEnd" VARCHAR(5) NOT NULL;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "startDate",
ADD COLUMN     "startDate" VARCHAR(10) NOT NULL,
DROP COLUMN "endDate",
ADD COLUMN     "endDate" VARCHAR(10) NOT NULL;

-- AlterTable
ALTER TABLE "TripInfo" DROP COLUMN "date",
ADD COLUMN     "date" VARCHAR(10) NOT NULL;
