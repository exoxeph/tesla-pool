import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { HttpError } from "../../common/httpError";
import { loginSchema, signupSchema } from "./auth.schema";
import { login, signup } from "./auth.service";

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
