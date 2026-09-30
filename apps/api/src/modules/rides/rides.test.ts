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
type MockTesla = { id: string; driverId: string; label: string; capacity: number; isOnline: boolean };
type MockPool = { id: string; teslaId: string; status: string; seatsTaken: number; createdAt: Date; updatedAt: Date };

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
      create: jest.fn(async ({ data }: { data: Omit<MockPool, "id" | "createdAt" | "updatedAt"> }) => {
        await tick();
        const now = new Date();
        const row: MockPool = { id: `pool-${nextPoolId++}`, createdAt: now, updatedAt: now, ...data };
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
          Object.assign(row, data, { updatedAt: new Date() });
          return row;
        }
      ),
      findMany: jest.fn(
        async ({
          where,
          orderBy,
        }: {
          where: { teslaId: string; status?: string | { in: string[] } };
          orderBy?: { createdAt?: "asc" | "desc"; updatedAt?: "asc" | "desc" };
        }) => {
          await tick();
          let rows = pools.filter((p) => p.teslaId === where.teslaId);
          if (typeof where.status === "string") {
            rows = rows.filter((p) => p.status === where.status);
          } else if (where.status) {
            const statusFilter = where.status;
            rows = rows.filter((p) => statusFilter.in.includes(p.status));
          }
          const sortKey = orderBy?.updatedAt ? "updatedAt" : "createdAt";
          const direction = orderBy?.updatedAt ?? orderBy?.createdAt ?? "asc";
          return [...rows].sort((a, b) =>
            direction === "desc"
              ? b[sortKey].getTime() - a[sortKey].getTime()
              : a[sortKey].getTime() - b[sortKey].getTime()
          );
        }
      ),
      // Atomic seat claim: only increments if the pool is still OPEN and
      // still has room (mirrors the real Prisma updateMany used in
      // acceptRideRequest for the last-seat race).
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; status?: string; seatsTaken?: { lte: number } };
          data: { seatsTaken: { increment: number } };
        }) => {
          await tick();
          const row = pools.find(
            (p) =>
              p.id === where.id &&
              (where.status === undefined || p.status === where.status) &&
              (where.seatsTaken === undefined || p.seatsTaken <= where.seatsTaken.lte)
          );
          if (!row) return { count: 0 };
          row.seatsTaken += data.seatsTaken.increment;
          row.updatedAt = new Date();
          return { count: 1 };
        }
      ),
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
          include,
        }: {
          where: { passengerId?: string; status?: string; poolId?: string | { in: string[] } };
          include?: { passenger?: boolean };
        }) => {
          await tick();
          let rows = rideRequests;
          if (where.passengerId) rows = rows.filter((r) => r.passengerId === where.passengerId);
          if (where.status) rows = rows.filter((r) => r.status === where.status);
          const poolIdFilter = where.poolId;
          if (typeof poolIdFilter === "string") {
            rows = rows.filter((r) => r.poolId === poolIdFilter);
          } else if (poolIdFilter) {
            rows = rows.filter((r) => r.poolId && poolIdFilter.in.includes(r.poolId));
          }
          const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          if (include?.passenger) {
            // No real User model in this mock — the passengerId itself
            // stands in for a display name, which is all these tests need.
            return sorted.map((r) => ({ ...r, passenger: { name: r.passengerId } }));
          }
          return sorted;
        }
      ),
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) => {
        await tick();
        return rideRequests.find((r) => r.id === id) ?? null;
      }),
      // Used by pool-matching.ts to find a pool's "anchor" — the earliest
      // still-active request in it. `include` attaches the real zone rows
      // (with lat/lng) the same way Prisma would resolve the relation.
      findFirst: jest.fn(
        async ({
          where,
          orderBy,
        }: {
          where: { poolId: string; status?: { not: string } };
          orderBy?: { createdAt: "asc" | "desc" };
        }) => {
          await tick();
          let rows = rideRequests.filter((r) => r.poolId === where.poolId);
          if (where.status?.not) rows = rows.filter((r) => r.status !== where.status!.not);
          rows = [...rows].sort((a, b) =>
            orderBy?.createdAt === "desc"
              ? b.createdAt.getTime() - a.createdAt.getTime()
              : a.createdAt.getTime() - b.createdAt.getTime()
          );
          const found = rows[0];
          if (!found) return null;
          return {
            ...found,
            pickupZone: zoneById(found.pickupZoneId),
            destinationZone: zoneById(found.destinationZoneId),
          };
        }
      ),
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
        create: jest.fn(async (args: { data: Omit<MockPool, "id" | "createdAt"> }) => {
          const row = await prismaMock.pool.create(args);
          undoStack.push(() => {
            pools = pools.filter((p) => p.id !== row.id);
          });
          return row;
        }),
        updateMany: jest.fn(
          async (args: {
            where: { id: string; status?: string; seatsTaken?: { lte: number } };
            data: { seatsTaken: { increment: number } };
          }) => {
            const target = pools.find(
              (p) =>
                p.id === args.where.id &&
                (args.where.status === undefined || p.status === args.where.status) &&
                (args.where.seatsTaken === undefined || p.seatsTaken <= args.where.seatsTaken.lte)
            );
            const prevSeatsTaken = target?.seatsTaken;
            const result = await prismaMock.pool.updateMany(args);
            if (result.count > 0 && target && prevSeatsTaken !== undefined) {
              undoStack.push(() => {
                target.seatsTaken = prevSeatsTaken;
              });
            }
            return result;
          }
        ),
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
const GULSHAN1 = ZONES.find((z) => z.name === "Gulshan 1")!;
const FARMGATE = ZONES.find((z) => z.name === "Farmgate")!;

beforeEach(() => {
  rideRequests = [];
  teslas = [
    { id: "tesla-1", driverId: "driver-1", label: "Bullet", capacity: 3, isOnline: true },
    { id: "tesla-2", driverId: "driver-2", label: "Volt", capacity: 4, isOnline: true },
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

async function createRequestWithRoute(
  passengerId: string,
  pickupZoneId: string,
  destinationZoneId: string,
  seats = 1
) {
  const res = await request(app)
    .post("/rides/request")
    .set("Authorization", `Bearer ${tokenFor(passengerId, "PASSENGER")}`)
    .send({ pickupZoneId, destinationZoneId, seats });
  return res.body.request.id as string;
}

async function acceptAs(driverToken: string, requestId: string) {
  return request(app).post(`/rides/${requestId}/accept`).set("Authorization", driverToken);
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

  it("lets only one of two concurrent completes win the same request", async () => {
    const id = await createRequest("passenger-1");
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;
    await request(app).post(`/rides/${id}/accept`).set("Authorization", driverToken);
    await request(app).patch(`/rides/${id}/driver-arrived`).set("Authorization", driverToken);
    await request(app).patch(`/rides/${id}/start`).set("Authorization", driverToken);

    const [resA, resB] = await Promise.all([
      request(app).patch(`/rides/${id}/complete`).set("Authorization", driverToken),
      request(app).patch(`/rides/${id}/complete`).set("Authorization", driverToken),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalRequest = rideRequests.find((r) => r.id === id)!;
    expect(finalRequest.status).toBe("COMPLETED");
    expect(pools.find((p) => p.id === finalRequest.poolId)?.status).toBe("COMPLETED");
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

  it("returns nothing for an offline driver", async () => {
    await createRequest("passenger-1");
    teslas.find((t) => t.driverId === "driver-1")!.isOnline = false;

    const res = await request(app)
      .get("/rides/available")
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(0);
  });
});

describe("online/offline gating", () => {
  it("rejects accepting a new request while the driver's tesla is offline", async () => {
    teslas.find((t) => t.driverId === "driver-1")!.isOnline = false;
    const id = await createRequest("passenger-1");

    const res = await acceptAs(`Bearer ${tokenFor("driver-1", "DRIVER")}`, id);

    expect(res.status).toBe(409);
    expect(rideRequests.find((r) => r.id === id)?.status).toBe("REQUESTED");
  });

  it("does not affect a pool already in progress when the driver goes offline", async () => {
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;
    const id = await createRequest("passenger-1");
    await acceptAs(driverToken, id);

    // Driver toggles offline mid-trip — an already-matched request must
    // still be workable through the rest of the lifecycle.
    teslas.find((t) => t.driverId === "driver-1")!.isOnline = false;

    const arrived = await request(app).patch(`/rides/${id}/driver-arrived`).set("Authorization", driverToken);
    expect(arrived.status).toBe(200);
    const started = await request(app).patch(`/rides/${id}/start`).set("Authorization", driverToken);
    expect(started.status).toBe(200);
    const completed = await request(app).patch(`/rides/${id}/complete`).set("Authorization", driverToken);
    expect(completed.status).toBe(200);
    expect(completed.body.request.status).toBe("COMPLETED");
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

describe("pooling", () => {
  it("pools two overlapping-but-different-destination requests together per the matching rule", async () => {
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;

    const founderId = await createRequestWithRoute("passenger-1", BANANI.id, MOHAKHALI.id, 1);
    const founded = await acceptAs(driverToken, founderId);
    expect(founded.status).toBe(200);
    const poolId = founded.body.request.poolId;

    // Same pickup (Banani), a different but nearby destination (Gulshan 1,
    // 2.43km from Mohakhali — within the 3km destination threshold).
    const joinerId = await createRequestWithRoute("passenger-2", BANANI.id, GULSHAN1.id, 1);
    const joined = await acceptAs(driverToken, joinerId);

    expect(joined.status).toBe(200);
    expect(joined.body.request.poolId).toBe(poolId);
    expect(pools.find((p) => p.id === poolId)?.seatsTaken).toBe(2);
  });

  it("does not pool a request outside the matching rule, even into a pool with room", async () => {
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;

    const founderId = await createRequestWithRoute("passenger-1", BANANI.id, MOHAKHALI.id, 1);
    const founded = await acceptAs(driverToken, founderId);
    const poolId = founded.body.request.poolId;

    // Farmgate is ~4.55km from Banani — over the 1.5km pickup threshold —
    // so this must NOT join the pool even though it has room.
    const outsiderId = await createRequestWithRoute("passenger-3", FARMGATE.id, MOHAKHALI.id, 1);
    const res = await acceptAs(driverToken, outsiderId);

    expect(res.status).toBe(200);
    expect(res.body.request.poolId).not.toBe(poolId);
    expect(pools.find((p) => p.id === poolId)?.seatsTaken).toBe(1);
  });

  it("matches hand-computed fares for a founding passenger and a joining passenger", async () => {
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;

    const founderId = await createRequestWithRoute("passenger-1", BANANI.id, MOHAKHALI.id, 1);
    const founded = await acceptAs(driverToken, founderId);
    // Founding a pool: no discount. BASE_FARE_PAISA (3000) +
    // round(1.8204km * PER_KM_RATE_PAISA (1500)) = 3000 + 2731 = 5731.
    expect(founded.body.request.farePaisa).toBe(5731);

    const joinerId = await createRequestWithRoute("passenger-2", BANANI.id, GULSHAN1.id, 1);
    const joined = await acceptAs(driverToken, joinerId);
    // Joining an existing pool: 15% off. Base = 3000 + round(1.1160km *
    // 1500) = 3000 + 1674 = 4674. Discounted = round(4674 * 0.85) = 3973.
    expect(joined.body.request.farePaisa).toBe(3973);
  });

  it("rejects joining a LOCKED pool even with free seats", async () => {
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;

    const founderId = await createRequestWithRoute("passenger-1", BANANI.id, MOHAKHALI.id, 1);
    const founded = await acceptAs(driverToken, founderId);
    const poolId = founded.body.request.poolId;

    await request(app).patch(`/rides/${founderId}/driver-arrived`).set("Authorization", driverToken);
    await request(app).patch(`/rides/${founderId}/start`).set("Authorization", driverToken);
    expect(pools.find((p) => p.id === poolId)?.status).toBe("LOCKED");

    // tesla-1 has capacity 3, only 1 seat taken — technically 2 free — but
    // the pool is LOCKED, so a compatible new request must not join it.
    const joinerId = await createRequestWithRoute("passenger-2", BANANI.id, GULSHAN1.id, 1);
    const res = await acceptAs(driverToken, joinerId);

    expect(res.status).toBe(200);
    expect(res.body.request.poolId).not.toBe(poolId);
    expect(pools.find((p) => p.id === poolId)?.seatsTaken).toBe(1);
  });

  it("claims the last seat exactly once under two concurrent joins, without overbooking", async () => {
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;

    // tesla-1 capacity 3: found the pool with a 2-seat request, leaving
    // exactly 1 seat free for the two concurrent 1-seat joins to race for.
    const founderId = await createRequestWithRoute("passenger-1", BANANI.id, MOHAKHALI.id, 2);
    const founded = await acceptAs(driverToken, founderId);
    const poolId = founded.body.request.poolId;
    expect(pools.find((p) => p.id === poolId)?.seatsTaken).toBe(2);

    const joinerAId = await createRequestWithRoute("passenger-2", BANANI.id, MOHAKHALI.id, 1);
    const joinerBId = await createRequestWithRoute("passenger-3", BANANI.id, MOHAKHALI.id, 1);

    const [resA, resB] = await Promise.all([
      acceptAs(driverToken, joinerAId),
      acceptAs(driverToken, joinerBId),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    // Exactly one seat was claimed — capacity is never exceeded.
    expect(pools.find((p) => p.id === poolId)?.seatsTaken).toBe(3);

    const winnerId = resA.status === 200 ? joinerAId : joinerBId;
    const loserId = resA.status === 200 ? joinerBId : joinerAId;
    expect(rideRequests.find((r) => r.id === winnerId)?.poolId).toBe(poolId);
    expect(rideRequests.find((r) => r.id === winnerId)?.status).toBe("MATCHED");
    // The loser's request was never touched — still REQUESTED, no pool.
    expect(rideRequests.find((r) => r.id === loserId)?.poolId).toBeNull();
    expect(rideRequests.find((r) => r.id === loserId)?.status).toBe("REQUESTED");
  });
});

describe("GET /rides/pools/mine", () => {
  it("returns the pool's full passenger list, not just a flat list of rides", async () => {
    const driverToken = `Bearer ${tokenFor("driver-1", "DRIVER")}`;

    const founderId = await createRequestWithRoute("passenger-1", BANANI.id, MOHAKHALI.id, 1);
    await acceptAs(driverToken, founderId);
    const joinerId = await createRequestWithRoute("passenger-2", BANANI.id, GULSHAN1.id, 1);
    await acceptAs(driverToken, joinerId);

    const res = await request(app).get("/rides/pools/mine").set("Authorization", driverToken);

    expect(res.status).toBe(200);
    expect(res.body.pools).toHaveLength(1);
    const pool = res.body.pools[0];
    expect(pool.status).toBe("OPEN");
    expect(pool.seatsTaken).toBe(2);
    expect(pool.capacity).toBe(3);
    expect(pool.passengers).toHaveLength(2);
    expect(pool.passengers.map((p: { requestId: string }) => p.requestId).sort()).toEqual(
      [founderId, joinerId].sort()
    );
    for (const passenger of pool.passengers) {
      expect(passenger).toMatchObject({
        passengerName: expect.any(String),
        pickupZoneId: expect.any(String),
        destinationZoneId: expect.any(String),
        status: "MATCHED",
        farePaisa: expect.any(Number),
      });
    }
  });

  it("never returns another driver's pools", async () => {
    const idForDriver2 = await createRequest("passenger-1");
    await acceptAs(`Bearer ${tokenFor("driver-2", "DRIVER")}`, idForDriver2);

    const res = await request(app)
      .get("/rides/pools/mine")
      .set("Authorization", `Bearer ${tokenFor("driver-1", "DRIVER")}`);

    expect(res.status).toBe(200);
    expect(res.body.pools).toHaveLength(0);
  });
});
