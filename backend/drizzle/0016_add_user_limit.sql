CREATE TABLE "UserLimit" (
	"userId" varchar(255) PRIMARY KEY NOT NULL,
	"maxWishlistSpots" integer NOT NULL,
	"maxPlans" integer NOT NULL,
	"maxSpotsPerDay" integer NOT NULL,
	"maxPlanDays" integer NOT NULL,
	"maxUserLocations" integer NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserLimit" ADD CONSTRAINT "UserLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;