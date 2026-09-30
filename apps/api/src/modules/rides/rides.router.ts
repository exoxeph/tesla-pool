import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../common/auth-middleware";
import { HttpError } from "../../common/httpError";
import { createRideRequestSchema } from "./rides.schema";
import {
  acceptRideRequest,
  cancelRideRequest,
  completeRide,
  createRideRequest,
  getOwnPoolDetail,
  listAvailableRideRequests,
  listOwnDriverRideRequests,
  listOwnPoolHistory,
  listOwnPoolsWithPassengers,
  listOwnRideRequests,
  markDriverArrived,
  startRide,
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
  asyncHandler(async (req, res) => {
    const requests = await listAvailableRideRequests(req.auth!.sub);
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

ridesRouter.patch(
  "/rides/:id/driver-arrived",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const request = await markDriverArrived(req.auth!.sub, req.params.id);
    res.json({ request });
  })
);

ridesRouter.patch(
  "/rides/:id/start",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const request = await startRide(req.auth!.sub, req.params.id);
    res.json({ request });
  })
);

ridesRouter.patch(
  "/rides/:id/complete",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const request = await completeRide(req.auth!.sub, req.params.id);
    res.json({ request });
  })
);

ridesRouter.get(
  "/rides/pools/mine",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const pools = await listOwnPoolsWithPassengers(req.auth!.sub);
    res.json({ pools });
  })
);

// Registered before /rides/pools/:id so "history" is never swallowed as
// a pool id.
ridesRouter.get(
  "/rides/pools/history",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const pools = await listOwnPoolHistory(req.auth!.sub);
    res.json({ pools });
  })
);

ridesRouter.get(
  "/rides/pools/:id",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const pool = await getOwnPoolDetail(req.auth!.sub, req.params.id);
    res.json({ pool });
  })
);
