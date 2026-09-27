import request from "supertest";
import { app } from "../../app";

type MockUser = {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: string;
};

type MockTesla = {
  id: string;
  driverId: string;
  label: string;
  capacity: number;
  isOnline: boolean;
};

let users: MockUser[] = [];
let teslas: MockTesla[] = [];
let nextUserId = 1;
let nextTeslaId = 1;

jest.mock("../../db/prisma", () => {
  const tx = {
    user: {
      create: jest.fn(async ({ data }: { data: Omit<MockUser, "id"> }) => {
        const user: MockUser = { id: String(nextUserId++), ...data };
        users.push(user);
        return user;
      }),
    },
    tesla: {
      create: jest.fn(async ({ data }: { data: Omit<MockTesla, "id"> }) => {
        const tesla: MockTesla = { id: String(nextTeslaId++), ...data };
        teslas.push(tesla);
        return tesla;
      }),
    },
  };

  return {
    prisma: {
      user: {
        findUnique: jest.fn(
          async ({ where: { phone } }: { where: { phone: string } }) =>
            users.find((u) => u.phone === phone) ?? null
        ),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
    },
  };
});

beforeEach(() => {
  users = [];
  teslas = [];
  nextUserId = 1;
  nextTeslaId = 1;
});

const validDriverSignup = {
  name: "Jashim",
  phone: "01700000001",
  password: "password123",
  vehicleLabel: "Bullet",
  capacity: 3,
};

describe("POST /auth/driver-signup", () => {
  it("creates both a user and a tesla with the correct capacity", async () => {
    const res = await request(app)
      .post("/auth/driver-signup")
      .send(validDriverSignup);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: "Jashim", role: "DRIVER" });
    expect(res.body.tesla).toMatchObject({
      label: "Bullet",
      capacity: 3,
      isOnline: false,
    });

    expect(users).toHaveLength(1);
    expect(teslas).toHaveLength(1);
    expect(teslas[0].driverId).toBe(users[0].id);
  });
});
