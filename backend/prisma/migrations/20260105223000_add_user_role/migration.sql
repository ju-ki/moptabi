-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('ADMIN', 'USER', 'GUEST');

-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN     "role" "RoleType" NOT NULL DEFAULT 'USER';
