ALTER TABLE "Transport" DROP CONSTRAINT "Transport_fromSpotId_fkey";
--> statement-breakpoint
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_toSpotId_fkey";
--> statement-breakpoint
DROP INDEX "UserLocation_userId_label_key";--> statement-breakpoint
ALTER TABLE "PlanLocation" DROP COLUMN "usageCount";--> statement-breakpoint
ALTER TABLE "public"."PlanLocation" ALTER COLUMN "locationType" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."LocationType";--> statement-breakpoint
CREATE TYPE "public"."LocationType" AS ENUM('DEPARTURE', 'DESTINATION', 'SPOT');--> statement-breakpoint
ALTER TABLE "public"."PlanLocation" ALTER COLUMN "locationType" SET DATA TYPE "public"."LocationType" USING "locationType"::"public"."LocationType";