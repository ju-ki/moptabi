CREATE TYPE "public"."RouteTransportType" AS ENUM('WALK', 'CAR', 'TRAIN', 'BUS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."StationType" AS ENUM('BUS', 'TRAIN', 'OTHER');--> statement-breakpoint
CREATE TABLE "PlanSpotNearestStation" (
	"id" serial PRIMARY KEY NOT NULL,
	"planSpotId" integer NOT NULL,
	"placeId" text NOT NULL,
	"stationType" "StationType" NOT NULL
);

--> statement-breakpoint
ALTER TABLE "PlanLocation" ADD COLUMN "time" varchar(5) NOT NULL DEFAULT '09:00';--> statement-breakpoint
ALTER TABLE "PlanSpot" ADD COLUMN "stayDuration" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "PlanSpotNearestStation" ADD CONSTRAINT "PlanSpotNearestStation_planSpotId_fkey" FOREIGN KEY ("planSpotId") REFERENCES "public"."PlanSpot"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint