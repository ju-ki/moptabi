CREATE UNIQUE INDEX "PlanLocation_idx1" ON "PlanLocation" USING btree ("planId","locationType");--> statement-breakpoint
CREATE UNIQUE INDEX "PlanSpot_idx1" ON "PlanSpot" USING btree ("planId","spotId");--> statement-breakpoint
CREATE UNIQUE INDEX "PlanSpotNearestStation_planSpotId_key" ON "PlanSpotNearestStation" USING btree ("planSpotId");
ALTER TABLE "PlanLocation"
  ALTER COLUMN "planId" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "PlanLocation"
  DROP CONSTRAINT "PlanLocation_planId_fkey";--> statement-breakpoint

ALTER TABLE "PlanLocation"
  ADD CONSTRAINT "PlanLocation_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;--> statement-breakpoint
