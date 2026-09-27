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

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
});

export const driverSignupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  vehicleLabel: z.string().trim().min(1, "Vehicle label is required").max(50),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(6, "Capacity must be at most 6"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DriverSignupInput = z.infer<typeof driverSignupSchema>;
