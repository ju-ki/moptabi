CREATE UNIQUE INDEX "PlanLocation_idx1" ON "PlanLocation" USING btree ("planId","locationType");--> statement-breakpoint
CREATE UNIQUE INDEX "PlanSpot_idx1" ON "PlanSpot" USING btree ("planId","spotId");--> statement-breakpoint
CREATE UNIQUE INDEX "PlanSpotNearestStation_planSpotId_key" ON "PlanSpotNearestStation" USING btree ("planSpotId");
