ALTER TABLE "PlanLocation" ALTER COLUMN "latitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanLocation" ALTER COLUMN "longitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanLocation" ALTER COLUMN "travelTime" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" ALTER COLUMN "placeId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "UserLocation" ALTER COLUMN "latitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "UserLocation" ALTER COLUMN "longitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "UserLocationNearestStation" ALTER COLUMN "placeId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanLocation" ADD COLUMN "encryptedData" text;--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" ADD COLUMN "encryptedPlaceId" text;--> statement-breakpoint
ALTER TABLE "UserLocation" ADD COLUMN "encryptedData" text;--> statement-breakpoint
ALTER TABLE "UserLocationNearestStation" ADD COLUMN "encryptedPlaceId" text;