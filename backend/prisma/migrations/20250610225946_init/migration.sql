-- CreateEnum
CREATE TYPE "TransportNodeType" AS ENUM ('DEPARTURE', 'DESTINATION', 'SPOT');

-- CreateTable
CREATE TABLE "Trip" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "imageUrl" VARCHAR(255),

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripInfo" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "genreId" INTEGER NOT NULL,
    "transportationMethods" INTEGER[],
    "memo" TEXT,

    CONSTRAINT "TripInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" VARCHAR(255) NOT NULL,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanSpot" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "spotId" TEXT NOT NULL,
    "stayStart" TIMESTAMP(3),
    "stayEnd" TIMESTAMP(3),
    "memo" TEXT,

    CONSTRAINT "PlanSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotMeta" (
    "id" VARCHAR(255) NOT NULL,
    "spotId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "rating" DOUBLE PRECISION,
    "categories" TEXT[],
    "catchphrase" TEXT,
    "description" TEXT,

    CONSTRAINT "SpotMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportMethod" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "TransportMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportMethodOnTransport" (
    "transportId" INTEGER NOT NULL,
    "transportMethodId" INTEGER NOT NULL,

    CONSTRAINT "TransportMethodOnTransport_pkey" PRIMARY KEY ("transportId","transportMethodId")
);

-- CreateTable
CREATE TABLE "Transport" (
    "id" SERIAL NOT NULL,
    "fromType" "TransportNodeType" NOT NULL,
    "toType" "TransportNodeType" NOT NULL,
    "travelTime" TEXT,
    "cost" INTEGER,
    "planSpotId" INTEGER,
    "fromLocationId" INTEGER,
    "toLocationId" INTEGER,

    CONSTRAINT "Transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearestStation" (
    "id" SERIAL NOT NULL,
    "spotId" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "walkingTime" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "NearestStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(255) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpotMeta_spotId_key" ON "SpotMeta"("spotId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripInfo" ADD CONSTRAINT "TripInfo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSpot" ADD CONSTRAINT "PlanSpot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSpot" ADD CONSTRAINT "PlanSpot_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotMeta" ADD CONSTRAINT "SpotMeta_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMethodOnTransport" ADD CONSTRAINT "TransportMethodOnTransport_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "Transport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportMethodOnTransport" ADD CONSTRAINT "TransportMethodOnTransport_transportMethodId_fkey" FOREIGN KEY ("transportMethodId") REFERENCES "TransportMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_planSpotId_fkey" FOREIGN KEY ("planSpotId") REFERENCES "PlanSpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "PlanSpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "PlanSpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearestStation" ADD CONSTRAINT "NearestStation_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
