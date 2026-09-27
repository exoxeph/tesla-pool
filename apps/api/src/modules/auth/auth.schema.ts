import { z } from "zod";

// Bangladeshi mobile format: 01[3-9]XXXXXXXX, 11 digits total.
const phoneSchema = z
  .string()
  .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
