ALTER TABLE "Transport" RENAME COLUMN "transportMethod" TO "transportMethodIds";--> statement-breakpoint
ALTER TABLE "Transport" ALTER COLUMN "transportMethodIds" TYPE integer[] USING ARRAY["transportMethodIds"];
