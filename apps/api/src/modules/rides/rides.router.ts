import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../common/auth-middleware";
import { HttpError } from "../../common/httpError";
import { createRideRequestSchema } from "./rides.schema";
import {
  acceptRideRequest,
  cancelRideRequest,
  createRideRequest,
  listAvailableRideRequests,
  listOwnDriverRideRequests,
  listOwnRideRequests,
} from "./rides.service";

export const ridesRouter = Router();

ridesRouter.post(
  "/rides/request",
  requireAuth,
  requireRole("PASSENGER"),
  asyncHandler(async (req, res) => {
    const parsed = createRideRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const request = await createRideRequest(req.auth!.sub, parsed.data);
    res.status(201).json({ request });
  })
);

ridesRouter.get(
  "/rides/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const requests = await listOwnRideRequests(req.auth!.sub);
    res.json({ requests });
  })
);

ridesRouter.patch(
  "/rides/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const request = await cancelRideRequest(req.params.id, req.auth!.sub);
    res.json({ request });
  })
);

ridesRouter.get(
  "/rides/available",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (_req, res) => {
    const requests = await listAvailableRideRequests();
    res.json({ requests });
  })
);

ridesRouter.get(
  "/rides/driver-mine",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const requests = await listOwnDriverRideRequests(req.auth!.sub);
    res.json({ requests });
  })
);

ridesRouter.post(
  "/rides/:id/accept",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const request = await acceptRideRequest(req.auth!.sub, req.params.id);
    res.json({ request });
  })
);
