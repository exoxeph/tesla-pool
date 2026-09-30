-- CreateEnum
CREATE TYPE "EventOutcome" AS ENUM ('SUCCESS', 'CONFLICT');

-- CreateTable
CREATE TABLE "ride_status_events" (
    "id" TEXT NOT NULL,
    "rideRequestId" TEXT NOT NULL,
    "fromStatus" "RideStatus" NOT NULL,
    "toStatus" "RideStatus" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "outcome" "EventOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_status_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ride_status_events" ADD CONSTRAINT "ride_status_events_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
