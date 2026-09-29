import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../app";
import { TEST_ZONES } from "../../common/__fixtures__/zones.fixture";

type MockZone = { id: string; name: string; lat: number; lng: number };
type MockRideRequest = {
  id: string;
  passengerId: string;
  pickupZoneId: string;
  destinationZoneId: string;
  seats: number;
  status: string;
  farePaisa: number | null;
  poolId: string | null;
  createdAt: Date;
};

const ZONES: MockZone[] = Object.entries(TEST_ZONES).map(([name, coords]) => ({
  id: `zone-${name.toLowerCase().replace(/\s+/g, "-")}`,
  name,
  ...coords,
}));
const zoneById = (id: string) => ZONES.find((z) => z.id === id) ?? null;

let rideRequests: MockRideRequest[] = [];
let nextId = 1;

jest.mock("../../db/prisma", () => ({
  prisma: {
    zone: {
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) =>
        zoneById(id)
      ),
    },
    rideRequest: {
      create: jest.fn(async ({ data }: { data: Omit<MockRideRequest, "id" | "status" | "poolId" | "createdAt"> }) => {
        const row: MockRideRequest = {
          id: String(nextId++),
          status: "REQUESTED",
          poolId: null,
          createdAt: new Date(),
          ...data,
        };
        rideRequests.push(row);
        return row;
      }),
      findMany: jest.fn(
        async ({ where: { passengerId } }: { where: { passengerId: string } }) =>
          rideRequests
            .filter((r) => r.passengerId === passengerId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      ),
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) =>
        rideRequests.find((r) => r.id === id) ?? null
      ),
      update: jest.fn(
        async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Partial<MockRideRequest>;
        }) => {
          const row = rideRequests.find((r) => r.id === id);
          if (!row) throw new Error("not found");
          Object.assign(row, data);
          return row;
        }
      ),
    },
  },
}));

const JWT_SECRET = "test-secret"; // matches jest.setup.js
function tokenFor(sub: string, role: string) {
  return jwt.sign({ sub, role }, JWT_SECRET, { expiresIn: "1h" });
}

const BANANI = ZONES.find((z) => z.name === "Banani")!;
const MOHAKHALI = ZONES.find((z) => z.name === "Mohakhali")!;

beforeEach(() => {
  rideRequests = [];
  nextId = 1;
});

describe("POST /rides/request", () => {
  it("persists correct pickup/destination/seats/fare", async () => {
    const res = await request(app)
      .post("/rides/request")
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`)
      .send({ pickupZoneId: BANANI.id, destinationZoneId: MOHAKHALI.id, seats: 2 });

    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({
      pickupZoneId: BANANI.id,
      destinationZoneId: MOHAKHALI.id,
      seats: 2,
      status: "REQUESTED",
      poolId: null,
    });
    expect(typeof res.body.request.farePaisa).toBe("number");
    expect(rideRequests).toHaveLength(1);
    expect(rideRequests[0].passengerId).toBe("passenger-1");
  });

  it("matches a hand-computed fare for Banani -> Mohakhali", async () => {
    // Distance (equirectangular, same formula as geo.test.ts): ~1.8204 km.
    // fare = BASE_FARE_PAISA (3000) + round(distanceKm * PER_KM_RATE_PAISA (1500))
    //      = 3000 + round(1.8204 * 1500) = 3000 + round(2730.66) = 3000 + 2731 = 5731
    const res = await request(app)
      .post("/rides/request")
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`)
      .send({ pickupZoneId: BANANI.id, destinationZoneId: MOHAKHALI.id, seats: 1 });

    expect(res.status).toBe(201);
    expect(res.body.request.farePaisa).toBe(5731);
  });
});

describe("GET /rides/mine", () => {
  it("a passenger cannot see another passenger's requests", async () => {
    await request(app)
      .post("/rides/request")
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`)
      .send({ pickupZoneId: BANANI.id, destinationZoneId: MOHAKHALI.id, seats: 1 });

    const res = await request(app)
      .get("/rides/mine")
      .set("Authorization", `Bearer ${tokenFor("passenger-2", "PASSENGER")}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(0);
  });
});

describe("PATCH /rides/:id/cancel", () => {
  it("a passenger cannot cancel another passenger's request (403)", async () => {
    const created = await request(app)
      .post("/rides/request")
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`)
      .send({ pickupZoneId: BANANI.id, destinationZoneId: MOHAKHALI.id, seats: 1 });

    const res = await request(app)
      .patch(`/rides/${created.body.request.id}/cancel`)
      .set("Authorization", `Bearer ${tokenFor("passenger-2", "PASSENGER")}`);

    expect(res.status).toBe(403);
  });

  it("rejects cancelling a request that is already CANCELLED (409)", async () => {
    const created = await request(app)
      .post("/rides/request")
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`)
      .send({ pickupZoneId: BANANI.id, destinationZoneId: MOHAKHALI.id, seats: 1 });

    const id = created.body.request.id;
    const token = `Bearer ${tokenFor("passenger-1", "PASSENGER")}`;

    const first = await request(app).patch(`/rides/${id}/cancel`).set("Authorization", token);
    expect(first.status).toBe(200);
    expect(first.body.request.status).toBe("CANCELLED");

    const second = await request(app).patch(`/rides/${id}/cancel`).set("Authorization", token);
    expect(second.status).toBe(409);
  });
});
