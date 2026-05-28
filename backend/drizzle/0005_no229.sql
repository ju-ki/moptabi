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
ALTER TABLE "SpotRoute" ADD CONSTRAINT "SpotRoute_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotRoute" ADD CONSTRAINT "SpotRoute_fromPlanSpotId_fkey" FOREIGN KEY ("fromPlanSpotId") REFERENCES "public"."PlanSpot"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotRoute" ADD CONSTRAINT "SpotRoute_toPlanSpotId_fkey" FOREIGN KEY ("toPlanSpotId") REFERENCES "public"."PlanSpot"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotRoute" ADD CONSTRAINT "SpotRoute_fromNearestStationId_fkey" FOREIGN KEY ("fromNearestStationId") REFERENCES "public"."PlanSpotNearestStation"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotRoute" ADD CONSTRAINT "SpotRoute_toNearestStationId_fkey" FOREIGN KEY ("toNearestStationId") REFERENCES "public"."PlanSpotNearestStation"("id") ON DELETE set null ON UPDATE cascade;