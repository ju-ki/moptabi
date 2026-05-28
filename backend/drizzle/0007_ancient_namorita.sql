CREATE TABLE "PlanLocationNearestStation" (
	"id" serial PRIMARY KEY NOT NULL,
	"planLocationId" integer NOT NULL,
	"placeId" text NOT NULL,
	"stationType" "StationType" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" ADD CONSTRAINT "PlanLocationNearestStation_planLocationId_fkey" FOREIGN KEY ("planLocationId") REFERENCES "public"."PlanLocation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "PlanLocationNearestStation_planLocationId_key" ON "PlanLocationNearestStation" USING btree ("planLocationId");