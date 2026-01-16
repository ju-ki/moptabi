/*
  Warnings:

  - You are about to drop the column `role` on the `UserNotification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "RoleType" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "UserNotification" DROP COLUMN "role";
