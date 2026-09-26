import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { prisma } from "../../db/prisma";

export const healthRouter = Router();

healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  })
);
