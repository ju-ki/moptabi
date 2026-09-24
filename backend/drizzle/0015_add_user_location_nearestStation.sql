CREATE TABLE "UserLocationNearestStation" (
	"id" serial PRIMARY KEY NOT NULL,
	"userLocationId" integer NOT NULL,
	"placeId" text NOT NULL,
	"stationType" "StationType" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserLocationNearestStation" ADD CONSTRAINT "UserLocationNearestStation_userLocationId_fkey" FOREIGN KEY ("userLocationId") REFERENCES "public"."UserLocation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "UserLocationNearestStation_userLocationId_key" ON "UserLocationNearestStation" USING btree ("userLocationId");