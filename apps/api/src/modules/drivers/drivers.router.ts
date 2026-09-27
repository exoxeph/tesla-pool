import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../common/auth-middleware";
import { HttpError } from "../../common/httpError";
import { updateStatusSchema } from "./drivers.schema";
import { getOwnTesla, updateOwnStatus } from "./drivers.service";

export const driversRouter = Router();

driversRouter.get(
  "/drivers/me",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const tesla = await getOwnTesla(req.auth!.sub);
    res.json({ tesla });
  })
);

driversRouter.patch(
  "/drivers/me/status",
  requireAuth,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const tesla = await updateOwnStatus(req.auth!.sub, parsed.data.isOnline);
    res.json({ tesla });
  })
);
