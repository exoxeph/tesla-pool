import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// Reuse a single client across ts-node-dev reloads instead of opening a new
// connection pool on every restart.
export const prisma = globalThis.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prisma;
}
