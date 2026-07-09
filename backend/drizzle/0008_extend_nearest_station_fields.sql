ALTER TABLE "PlanSpotNearestStation" ADD COLUMN IF NOT EXISTS "transitTime" integer;--> statement-breakpoint
ALTER TABLE "PlanSpotNearestStation" ADD COLUMN IF NOT EXISTS "scheduledDepartureTime" varchar(5);--> statement-breakpoint
ALTER TABLE "PlanSpotNearestStation" ADD COLUMN IF NOT EXISTS "memo" text;--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" ADD COLUMN IF NOT EXISTS "transitTime" integer;--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" ADD COLUMN IF NOT EXISTS "scheduledDepartureTime" varchar(5);--> statement-breakpoint
ALTER TABLE "PlanLocationNearestStation" ADD COLUMN IF NOT EXISTS "memo" text;