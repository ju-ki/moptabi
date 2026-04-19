ALTER TABLE "Spot" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "SpotMeta" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "Spot" CASCADE;--> statement-breakpoint
DROP TABLE "SpotMeta" CASCADE;--> statement-breakpoint