DROP TABLE "Transport" CASCADE;--> statement-breakpoint
ALTER TABLE "PlanLocation" ADD COLUMN "transportMethodId" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanLocation" ADD COLUMN "travelTime" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanSpot" ADD COLUMN "transportMethodId" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "PlanSpot" ADD COLUMN "travelTime" integer DEFAULT 0 NOT NULL;