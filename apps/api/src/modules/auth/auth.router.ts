import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { HttpError } from "../../common/httpError";
import { driverSignupSchema, loginSchema, signupSchema } from "./auth.schema";
import { driverSignup, login, signup } from "./auth.service";

export const authRouter = Router();

authRouter.post(
  "/auth/signup",
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const result = await signup(parsed.data);
    res.status(201).json(result);
  })
);

authRouter.post(
  "/auth/driver-signup",
  asyncHandler(async (req, res) => {
    const parsed = driverSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const result = await driverSignup(parsed.data);
    res.status(201).json(result);
  })
);

authRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const result = await login(parsed.data);
    res.json(result);
  })
);
