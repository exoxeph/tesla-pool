import { z } from "zod";

export const updateStatusSchema = z.object({
  isOnline: z.boolean(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
