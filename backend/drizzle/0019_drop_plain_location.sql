ALTER TABLE "PlanLocation" ALTER COLUMN "encryptedData" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" ALTER COLUMN "encryptedPlaceId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "UserLocation" ALTER COLUMN "encryptedData" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "UserLocationNearestStation" ALTER COLUMN "encryptedPlaceId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanLocation" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "PlanLocation" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "PlanLocation" DROP COLUMN "travelTime";--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" DROP COLUMN "placeId";--> statement-breakpoint
ALTER TABLE "UserLocation" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "UserLocation" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "UserLocation" DROP COLUMN "label";--> statement-breakpoint
ALTER TABLE "UserLocationNearestStation" DROP COLUMN "placeId";