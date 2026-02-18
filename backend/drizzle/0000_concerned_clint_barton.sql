CREATE TYPE "public"."NotificationType" AS ENUM('SYSTEM', 'INFO');--> statement-breakpoint
CREATE TYPE "public"."RoleType" AS ENUM('ADMIN', 'USER', 'GUEST');--> statement-breakpoint
CREATE TYPE "public"."TransportNodeType" AS ENUM('DEPARTURE', 'DESTINATION', 'SPOT');--> statement-breakpoint
CREATE TABLE "NearestStation" (
	"id" serial PRIMARY KEY NOT NULL,
	"spotId" text,
	"name" varchar(255) NOT NULL,
	"walkingTime" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"type" "NotificationType" NOT NULL,
	"publishedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"tripId" integer NOT NULL,
	"date" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PlanSpot" (
	"id" serial PRIMARY KEY NOT NULL,
	"planId" integer NOT NULL,
	"spotId" text NOT NULL,
	"memo" text,
	"order" integer DEFAULT 0 NOT NULL,
	"stayStart" varchar(5) NOT NULL,
	"stayEnd" varchar(5) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Spot" (
	"id" varchar(255) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SpotMeta" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"spotId" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"image" text,
	"rating" double precision,
	"categories" text[],
	"catchphrase" text,
	"description" text,
	"openingHours" jsonb,
	"address" varchar(255),
	"prefecture" varchar(50),
	"url" text
);
--> statement-breakpoint
CREATE TABLE "Transport" (
	"id" serial PRIMARY KEY NOT NULL,
	"fromType" "TransportNodeType" NOT NULL,
	"toType" "TransportNodeType" NOT NULL,
	"travelTime" text,
	"cost" integer,
	"fromSpotId" integer,
	"planId" integer NOT NULL,
	"toSpotId" integer,
	"transportMethod" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Trip" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(50) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"imageUrl" varchar(255),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"startDate" varchar(10) NOT NULL,
	"endDate" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TripInfo" (
	"id" serial PRIMARY KEY NOT NULL,
	"tripId" integer NOT NULL,
	"genreId" integer NOT NULL,
	"memo" text,
	"date" varchar(10) NOT NULL,
	"transportationMethods" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"role" "RoleType" DEFAULT 'USER' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"email" varchar(255),
	"image" varchar(500),
	"lastLoginAt" timestamp(3),
	"name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "UserNotification" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"notificationId" integer NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"spotId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"memo" text,
	"priority" integer DEFAULT 1 NOT NULL,
	"visited" integer DEFAULT 0 NOT NULL,
	"visitedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "NearestStation" ADD CONSTRAINT "NearestStation_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "public"."Spot"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PlanSpot" ADD CONSTRAINT "PlanSpot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PlanSpot" ADD CONSTRAINT "PlanSpot_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "public"."Spot"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpotMeta" ADD CONSTRAINT "SpotMeta_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "public"."Spot"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_fromSpotId_fkey" FOREIGN KEY ("fromSpotId") REFERENCES "public"."PlanSpot"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_toSpotId_fkey" FOREIGN KEY ("toSpotId") REFERENCES "public"."PlanSpot"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TripInfo" ADD CONSTRAINT "TripInfo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "public"."Spot"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "SpotMeta_spotId_key" ON "SpotMeta" USING btree ("spotId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "UserNotification_userId_notificationId_key" ON "UserNotification" USING btree ("userId" text_ops,"notificationId" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Wishlist_userId_spotId_key" ON "Wishlist" USING btree ("userId" text_ops,"spotId" text_ops);