import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { listZones } from "./zones.service";

export const zonesRouter = Router();

zonesRouter.get(
  "/zones",
  asyncHandler(async (_req, res) => {
    const zones = await listZones();
    res.json({ zones });
  })
);
