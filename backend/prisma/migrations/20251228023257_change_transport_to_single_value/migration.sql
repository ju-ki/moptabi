/*
  Warnings:

  - You are about to drop the `TransportMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportMethodOnTransport` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `transportMethod` to the `Transport` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `transportationMethods` on the `TripInfo` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "TransportMethodOnTransport" DROP CONSTRAINT "TransportMethodOnTransport_transportId_fkey";

-- DropForeignKey
ALTER TABLE "TransportMethodOnTransport" DROP CONSTRAINT "TransportMethodOnTransport_transportMethodId_fkey";

-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "transportMethod" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TripInfo" DROP COLUMN "transportationMethods",
ADD COLUMN     "transportationMethods" INTEGER NOT NULL;

-- DropTable
DROP TABLE "TransportMethod";

-- DropTable
DROP TABLE "TransportMethodOnTransport";
