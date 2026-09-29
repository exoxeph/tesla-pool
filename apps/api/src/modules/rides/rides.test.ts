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
type MockTesla = { id: string; driverId: string; label: string; capacity: number };
type MockPool = { id: string; teslaId: string; status: string; seatsTaken: number };

const ZONES: MockZone[] = Object.entries(TEST_ZONES).map(([name, coords]) => ({
  id: `zone-${name.toLowerCase().replace(/\s+/g, "-")}`,
  name,
  ...coords,
}));
const zoneById = (id: string) => ZONES.find((z) => z.id === id) ?? null;

let rideRequests: MockRideRequest[] = [];
let teslas: MockTesla[] = [];
let pools: MockPool[] = [];
let nextId = 1;
let nextPoolId = 1;

// Real Prisma calls round-trip to Postgres, so two concurrent requests
// genuinely interleave their reads and writes. This mock has no such
// latency by default, which lets concurrent supertest calls accidentally
// run fully sequentially instead of racing — hiding the exact bugs the
// race tests below exist to catch. Awaiting a real event-loop turn before
// every mocked DB call forces genuine interleaving instead.
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

jest.mock("../../db/prisma", () => {
  const prismaMock: any = {
    zone: {
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) => {
        await tick();
        return zoneById(id);
      }),
    },
    tesla: {
      findUnique: jest.fn(
        async ({ where }: { where: { id?: string; driverId?: string } }) => {
          await tick();
          if (where.id) return teslas.find((t) => t.id === where.id) ?? null;
          if (where.driverId) return teslas.find((t) => t.driverId === where.driverId) ?? null;
          return null;
        }
      ),
    },
    pool: {
      create: jest.fn(async ({ data }: { data: Omit<MockPool, "id"> }) => {
        await tick();
        const row: MockPool = { id: `pool-${nextPoolId++}`, ...data };
        pools.push(row);
        return row;
      }),
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) => {
        await tick();
        return pools.find((p) => p.id === id) ?? null;
      }),
      update: jest.fn(
        async ({ where: { id }, data }: { where: { id: string }; data: Partial<MockPool> }) => {
          await tick();
          const row = pools.find((p) => p.id === id);
          if (!row) throw new Error("pool not found");
          Object.assign(row, data);
          return row;
        }
      ),
      findMany: jest.fn(async ({ where: { teslaId } }: { where: { teslaId: string } }) => {
        await tick();
        return pools.filter((p) => p.teslaId === teslaId);
      }),
    },
    rideRequest: {
      create: jest.fn(async ({ data }: { data: Omit<MockRideRequest, "id" | "status" | "poolId" | "createdAt"> }) => {
        await tick();
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
        async ({
          where,
        }: {
          where: { passengerId?: string; status?: string; poolId?: { in: string[] } };
        }) => {
          await tick();
          let rows = rideRequests;
          if (where.passengerId) rows = rows.filter((r) => r.passengerId === where.passengerId);
          if (where.status) rows = rows.filter((r) => r.status === where.status);
          if (where.poolId) rows = rows.filter((r) => r.poolId && where.poolId!.in.includes(r.poolId));
          return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
      ),
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) => {
        await tick();
        return rideRequests.find((r) => r.id === id) ?? null;
      }),
      update: jest.fn(
        async ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Partial<MockRideRequest>;
        }) => {
          await tick();
          const row = rideRequests.find((r) => r.id === id);
          if (!row) throw new Error("not found");
          Object.assign(row, data);
          return row;
        }
      ),
      // The conditional write every lifecycle mutation now uses: only
      // updates a row whose status still matches what the caller read
      // earlier. count === 0 means someone else's write got there first.
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; status?: string };
          data: Partial<MockRideRequest>;
        }) => {
          await tick();
          const row = rideRequests.find(
            (r) => r.id === where.id && (where.status === undefined || r.status === where.status)
          );
          if (!row) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        }
      ),
    },
  };

  // Mimics Prisma's interactive transaction. Two genuinely concurrent
  // transactions can be in flight at once in these race tests (that's the
  // whole point), so rollback can't snapshot/restore the whole shared
  // pools/rideRequests arrays — a later transaction's legitimate write
  // would get wiped out by an earlier one's rollback. Instead, each
  // transaction gets its own tx client that records precisely which rows
  // it changed and their prior values, and only undoes those specific
  // writes if its own callback throws.
  function withUndo(undoStack: Array<() => void>) {
    return {
      ...prismaMock,
      pool: {
        ...prismaMock.pool,
        create: jest.fn(async (args: { data: Omit<MockPool, "id"> }) => {
          const row = await prismaMock.pool.create(args);
          undoStack.push(() => {
            pools = pools.filter((p) => p.id !== row.id);
          });
          return row;
        }),
      },
      rideRequest: {
        ...prismaMock.rideRequest,
        updateMany: jest.fn(
          async (args: { where: { id: string; status?: string }; data: Partial<MockRideRequest> }) => {
            const target = rideRequests.find(
              (r) =>
                r.id === args.where.id &&
                (args.where.status === undefined || r.status === args.where.status)
            );
            const prevValues = target ? { ...target } : null;
            const result = await prismaMock.rideRequest.updateMany(args);
            if (result.count > 0 && prevValues && target) {
              undoStack.push(() => Object.assign(target, prevValues));
            }
            return result;
          }
        ),
      },
    };
  }

  prismaMock.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === "function") {
      const undoStack: Array<() => void> = [];
      const tx = withUndo(undoStack);
      try {
        return await (arg as (tx: unknown) => Promise<unknown>)(tx);
      } catch (err) {
        for (let i = undoStack.length - 1; i >= 0; i--) undoStack[i]();
        throw err;
      }
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return { prisma: prismaMock };
});

const JWT_SECRET = "test-secret"; // matches jest.setup.js
function tokenFor(sub: string, role: string) {
  return jwt.sign({ sub, role }, JWT_SECRET, { expiresIn: "1h" });
}

const BANANI = ZONES.find((z) => z.name === "Banani")!;
const MOHAKHALI = ZONES.find((z) => z.name === "Mohakhali")!;

beforeEach(() => {
  rideRequests = [];
  teslas = [
    { id: "tesla-1", driverId: "driver-1", label: "Bullet", capacity: 3 },
    { id: "tesla-2", driverId: "driver-2", label: "Volt", capacity: 4 },
  ];
  pools = [];
  nextId = 1;
  nextPoolId = 1;
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
    // Fare scales with seats: 5731 (1-seat fare for this pair, see the
    // hand-computed test below) * 2 seats = 11462.
    expect(res.body.request.farePaisa).toBe(11462);
    expect(rideRequests).toHaveLength(1);
    expect(rideRequests[0].passengerId).toBe("passenger-1");
  });

  it("rejects a pickup zone that equals the destination zone", async () => {
    const res = await request(app)
      .post("/rides/request")
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`)
      .send({ pickupZoneId: BANANI.id, destinationZoneId: BANANI.id, seats: 1 });

    expect(res.status).toBe(400);
    expect(rideRequests).toHaveLength(0);
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

  it("doesn't let a cancel silently win against a concurrent accept", async () => {
    const created = await request(app)
      .post("/rides/request")
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`)
      .send({ pickupZoneId: BANANI.id, destinationZoneId: MOHAKHALI.id, seats: 1 });
    const id = created.body.request.id;

    const [cancelRes, acceptRes] = await Promise.all([
      request(app).patch(`/rides/${id}/cancel`).set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`),
      request(app).post(`/rides/${id}/accept`).set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`),
    ]);

    // Exactly one of the two actions should have actually taken effect —
    // never both, and never a silently overwritten result.
    const statuses = [cancelRes.status, acceptRes.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalRequest = rideRequests.find((r) => r.id === id)!;
    if (cancelRes.status === 200) {
      expect(finalRequest.status).toBe("CANCELLED");
      expect(pools).toHaveLength(0); // accept's speculative pool was rolled back
    } else {
      expect(finalRequest.status).toBe("MATCHED");
    }
  });
});

async function createRequest(passengerId: string, seats = 1) {
  const res = await request(app)
    .post("/rides/request")
    .set("Authorization", `Bearer ${tokenFor(passengerId, "PASSENGER")}`)
    .send({ pickupZoneId: BANANI.id, destinationZoneId: MOHAKHALI.id, seats });
  return res.body.request.id as string;
}

describe("ride lifecycle", () => {
  it("runs the full valid sequence end to end: REQUESTED -> MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED", async () => {
    const id = await createRequest("passenger-1");
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;

    const accepted = await request(app).post(`/rides/${id}/accept`).set("Authorization", driverToken);
    expect(accepted.status).toBe(200);
    expect(accepted.body.request.status).toBe("MATCHED");
    expect(accepted.body.request.poolId).toBeTruthy();
    expect(pools.find((p) => p.id === accepted.body.request.poolId)?.status).toBe("OPEN");

    const arrived = await request(app).patch(`/rides/${id}/driver-arrived`).set("Authorization", driverToken);
    expect(arrived.status).toBe(200);
    expect(arrived.body.request.status).toBe("DRIVER_ARRIVED");
    // Pool stays OPEN after driver-arrived — a compatible second passenger
    // could still join before the driver actually starts driving.
    expect(pools.find((p) => p.id === accepted.body.request.poolId)?.status).toBe("OPEN");

    const started = await request(app).patch(`/rides/${id}/start`).set("Authorization", driverToken);
    expect(started.status).toBe(200);
    expect(started.body.request.status).toBe("STARTED");
    // Only STARTED locks the pool.
    expect(pools.find((p) => p.id === accepted.body.request.poolId)?.status).toBe("LOCKED");

    const completed = await request(app).patch(`/rides/${id}/complete`).set("Authorization", driverToken);
    expect(completed.status).toBe(200);
    expect(completed.body.request.status).toBe("COMPLETED");
    expect(pools.find((p) => p.id === accepted.body.request.poolId)?.status).toBe("COMPLETED");
  });

  it("rejects an invalid jump: calling /start while still REQUESTED", async () => {
    const id = await createRequest("passenger-1");
    const res = await request(app)
      .patch(`/rides/${id}/start`)
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    // Not yet accepted, so this request has no pool at all.
    expect(res.status).toBe(409);
  });

  it("rejects an invalid jump: calling /complete while still MATCHED", async () => {
    const id = await createRequest("passenger-1");
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;
    await request(app).post(`/rides/${id}/accept`).set("Authorization", driverToken);

    const res = await request(app).patch(`/rides/${id}/complete`).set("Authorization", driverToken);
    expect(res.status).toBe(409);
  });

  it("rejects a driver acting on a request tied to a different driver's tesla (403)", async () => {
    const id = await createRequest("passenger-1");
    await request(app).post(`/rides/${id}/accept`).set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    const res = await request(app)
      .patch(`/rides/${id}/driver-arrived`)
      .set("Authorization", `Bearer ${tokenFor("driver-2", "DRIVER")}`);

    expect(res.status).toBe(403);
  });

  it("doesn't let driver-arrived silently win against a concurrent cancel", async () => {
    const id = await createRequest("passenger-1");
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;
    await request(app).post(`/rides/${id}/accept`).set("Authorization", driverToken);

    const [arrivedRes, cancelRes] = await Promise.all([
      request(app).patch(`/rides/${id}/driver-arrived`).set("Authorization", driverToken),
      request(app).patch(`/rides/${id}/cancel`).set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`),
    ]);

    const statuses = [arrivedRes.status, cancelRes.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalRequest = rideRequests.find((r) => r.id === id)!;
    expect(finalRequest.status).toBe(arrivedRes.status === 200 ? "DRIVER_ARRIVED" : "CANCELLED");
  });

  it("doesn't let start silently win against a concurrent cancel, and keeps request+pool in sync", async () => {
    const id = await createRequest("passenger-1");
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;
    await request(app).post(`/rides/${id}/accept`).set("Authorization", driverToken);
    await request(app).patch(`/rides/${id}/driver-arrived`).set("Authorization", driverToken);

    const [startRes, cancelRes] = await Promise.all([
      request(app).patch(`/rides/${id}/start`).set("Authorization", driverToken),
      request(app).patch(`/rides/${id}/cancel`).set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`),
    ]);

    const statuses = [startRes.status, cancelRes.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalRequest = rideRequests.find((r) => r.id === id)!;
    if (startRes.status === 200) {
      // Request and pool must have flipped together — never one without
      // the other, since they now share one transaction.
      expect(finalRequest.status).toBe("STARTED");
      expect(pools.find((p) => p.id === finalRequest.poolId)?.status).toBe("LOCKED");
    } else {
      expect(finalRequest.status).toBe("CANCELLED");
      // A losing start must not have locked the pool anyway.
      expect(pools.find((p) => p.id === finalRequest.poolId)?.status).toBe("OPEN");
    }
  });

  it("allows cancelling from MATCHED and DRIVER_ARRIVED", async () => {
    const matchedId = await createRequest("passenger-1");
    const driverToken1 = `Bearer ${tokenFor("driver-1", "DRIVER")}`;
    await request(app).post(`/rides/${matchedId}/accept`).set("Authorization", driverToken1);

    const cancelMatched = await request(app)
      .patch(`/rides/${matchedId}/cancel`)
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`);
    expect(cancelMatched.status).toBe(200);
    expect(cancelMatched.body.request.status).toBe("CANCELLED");

    const arrivedId = await createRequest("passenger-1");
    const driverToken2 = `Bearer ${tokenFor("driver-2", "DRIVER")}`;
    await request(app).post(`/rides/${arrivedId}/accept`).set("Authorization", driverToken2);
    await request(app).patch(`/rides/${arrivedId}/driver-arrived`).set("Authorization", driverToken2);

    const cancelArrived = await request(app)
      .patch(`/rides/${arrivedId}/cancel`)
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`);
    expect(cancelArrived.status).toBe(200);
    expect(cancelArrived.body.request.status).toBe("CANCELLED");
  });

  it("rejects cancelling once STARTED", async () => {
    const id = await createRequest("passenger-1");
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;
    await request(app).post(`/rides/${id}/accept`).set("Authorization", driverToken);
    await request(app).patch(`/rides/${id}/driver-arrived`).set("Authorization", driverToken);
    await request(app).patch(`/rides/${id}/start`).set("Authorization", driverToken);

    const res = await request(app)
      .patch(`/rides/${id}/cancel`)
      .set("Authorization", `Bearer ${tokenFor("passenger-1", "PASSENGER")}`);
    expect(res.status).toBe(409);
  });

  it("rejects accepting a request whose seats exceed the driver's tesla capacity", async () => {
    // tesla-1 (driver-1) has capacity 3.
    const id = await createRequest("passenger-1", 4);
    const res = await request(app)
      .post(`/rides/${id}/accept`)
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    expect(res.status).toBe(409);
    expect(pools).toHaveLength(0);
  });

  it("lets only one of two concurrent accepts win the same request, with no orphaned pool", async () => {
    const id = await createRequest("passenger-1");

    const [resA, resB] = await Promise.all([
      request(app).post(`/rides/${id}/accept`).set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`),
      request(app).post(`/rides/${id}/accept`).set("Authorization", `Bearer ${tokenFor("driver-2", "DRIVER")}`),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    // The loser's speculatively created pool must have been rolled back —
    // exactly one pool should exist, and it must be the one actually
    // linked to the request.
    expect(pools).toHaveLength(1);
    const finalRequest = rideRequests.find((r) => r.id === id)!;
    expect(finalRequest.status).toBe("MATCHED");
    expect(finalRequest.poolId).toBe(pools[0].id);
  });
});

describe("GET /rides/available", () => {
  it("excludes a request already matched to a driver", async () => {
    const openId = await createRequest("passenger-1");
    const matchedId = await createRequest("passenger-1");
    await request(app)
      .post(`/rides/${matchedId}/accept`)
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    const res = await request(app)
      .get("/rides/available")
      .set("Authorization", `Bearer ${tokenFor("driver-2", "DRIVER")}`);

    expect(res.status).toBe(200);
    const ids = res.body.requests.map((r: { id: string }) => r.id);
    expect(ids).toContain(openId);
    expect(ids).not.toContain(matchedId);
  });
});

describe("GET /rides/driver-mine", () => {
  it("only returns this driver's own trips, not another driver's", async () => {
    const idForDriver1 = await createRequest("passenger-1");
    await request(app)
      .post(`/rides/${idForDriver1}/accept`)
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    const idForDriver2 = await createRequest("passenger-1");
    await request(app)
      .post(`/rides/${idForDriver2}/accept`)
      .set("Authorization", `Bearer ${tokenFor("driver-2", "DRIVER")}`);

    const res = await request(app)
      .get("/rides/driver-mine")
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].id).toBe(idForDriver1);
  });
});
