import { z } from "zod";

export const createRideRequestSchema = z
  .object({
    pickupZoneId: z.string().min(1, "Pickup zone is required"),
    destinationZoneId: z.string().min(1, "Destination zone is required"),
    seats: z
      .number()
      .int("Seats must be a whole number")
      .min(1, "Seats must be at least 1")
      .max(6, "Seats must be at most 6"),
  })
  .refine((data) => data.pickupZoneId !== data.destinationZoneId, {
    message: "Pickup and destination must be different zones",
    path: ["destinationZoneId"],
  });

export type CreateRideRequestInput = z.infer<typeof createRideRequestSchema>;
