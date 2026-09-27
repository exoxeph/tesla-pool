import bcrypt from "bcryptjs";
import request from "supertest";
import { app } from "../../app";

type MockUser = {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: string;
};

let users: MockUser[] = [];
let nextId = 1;

jest.mock("../../db/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(async ({ where: { phone } }: { where: { phone: string } }) =>
        users.find((u) => u.phone === phone) ?? null
      ),
      create: jest.fn(
        async ({ data }: { data: Omit<MockUser, "id"> }) => {
          const user: MockUser = { id: String(nextId++), ...data };
          users.push(user);
          return user;
        }
      ),
    },
  },
}));

beforeEach(() => {
  users = [];
  nextId = 1;
});

const validSignup = {
  name: "Nusrat",
  phone: "01700000002",
  password: "password123",
};

describe("POST /auth/signup", () => {
  it("creates a passenger and returns a token", async () => {
    const res = await request(app).post("/auth/signup").send(validSignup);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: "Nusrat",
      phone: "01700000002",
      role: "PASSENGER",
    });
  });

  it("rejects a duplicate phone number", async () => {
    await request(app).post("/auth/signup").send(validSignup);

    const res = await request(app)
      .post("/auth/signup")
      .send({ ...validSignup, name: "Nusrat Again" });

    expect(res.status).toBe(409);
  });
});

describe("POST /auth/login", () => {
  async function seedUser(password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    users.push({
      id: "1",
      name: "Nusrat",
      phone: "01700000002",
      passwordHash,
      role: "PASSENGER",
    });
  }

  it("logs in with the correct password", async () => {
    await seedUser("password123");

    const res = await request(app)
      .post("/auth/login")
      .send({ phone: "01700000002", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("rejects an incorrect password", async () => {
    await seedUser("password123");

    const res = await request(app)
      .post("/auth/login")
      .send({ phone: "01700000002", password: "wrong-password" });

    expect(res.status).toBe(401);
  });
});
