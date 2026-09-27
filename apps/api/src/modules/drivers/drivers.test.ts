import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../app";

type MockTesla = {
  id: string;
  driverId: string;
  label: string;
  capacity: number;
  isOnline: boolean;
};

let teslas: MockTesla[] = [];

jest.mock("../../db/prisma", () => ({
  prisma: {
    tesla: {
      findUnique: jest.fn(
        async ({ where: { driverId } }: { where: { driverId: string } }) =>
          teslas.find((t) => t.driverId === driverId) ?? null
      ),
      update: jest.fn(
        async ({
          where: { driverId },
          data,
        }: {
          where: { driverId: string };
          data: Partial<MockTesla>;
        }) => {
          const tesla = teslas.find((t) => t.driverId === driverId);
          if (!tesla) throw new Error("tesla not found");
          Object.assign(tesla, data);
          return tesla;
        }
      ),
    },
  },
}));

// Matches jest.setup.js's JWT_SECRET fallback for the test environment.
const JWT_SECRET = "test-secret";

function tokenFor(sub: string, role: string) {
  return jwt.sign({ sub, role }, JWT_SECRET, { expiresIn: "1h" });
}

beforeEach(() => {
  teslas = [
    { id: "tesla-1", driverId: "driver-1", label: "Bullet", capacity: 3, isOnline: false },
    { id: "tesla-2", driverId: "driver-2", label: "Volt", capacity: 4, isOnline: false },
  ];
});

describe("PATCH /drivers/me/status", () => {
  it("updates only the authenticated driver's own tesla", async () => {
    const res = await request(app)
      .patch("/drivers/me/status")
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`)
      .send({ isOnline: true });

    expect(res.status).toBe(200);
    expect(res.body.tesla).toMatchObject({ id: "tesla-1", isOnline: true });
    expect(teslas.find((t) => t.driverId === "driver-2")?.isOnline).toBe(false);
  });
});
