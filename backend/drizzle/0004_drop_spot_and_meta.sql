ALTER TABLE "Spot" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "SpotMeta" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "Spot" CASCADE;--> statement-breakpoint
DROP TABLE "SpotMeta" CASCADE;--> statement-breakpoint
-- ALTER TABLE "NearestStation" DROP CONSTRAINT "NearestStation_spotId_fkey";
-- --> statement-breakpoint
-- ALTER TABLE "PlanSpot" DROP CONSTRAINT "PlanSpot_spotId_fkey";
-- --> statement-breakpoint
-- ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_spotId_fkey";
