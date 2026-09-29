import type { RideStatus } from "@prisma/client";

// REQUESTED -> MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED.
// CANCELLED is reachable from REQUESTED, MATCHED, or DRIVER_ARRIVED — not
// from STARTED, since a trip already in motion isn't a "never happened"
// cancellation anymore. Every endpoint that changes a RideRequest's status
// must go through this map rather than hand-rolling its own check.
const TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ["MATCHED", "CANCELLED"],
  MATCHED: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidTransition(current: RideStatus, next: RideStatus): boolean {
  return TRANSITIONS[current].includes(next);
}
