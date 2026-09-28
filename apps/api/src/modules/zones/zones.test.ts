import request from "supertest";
import { app } from "../../app";
import { TEST_ZONES } from "../../common/__fixtures__/zones.fixture";

type MockZone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

const mockZones: MockZone[] = Object.entries(TEST_ZONES).map(
  ([name, coords], i) => ({ id: String(i + 1), name, ...coords })
);

jest.mock("../../db/prisma", () => ({
  prisma: {
    zone: {
      findMany: jest.fn(async () => mockZones),
    },
  },
}));

describe("GET /zones", () => {
  it("returns all 9 zones with correct coordinates", async () => {
    const res = await request(app).get("/zones");

    expect(res.status).toBe(200);
    expect(res.body.zones).toHaveLength(9);

    const banani = res.body.zones.find((z: MockZone) => z.name === "Banani");
    expect(banani).toMatchObject({
      name: "Banani",
      lat: 23.793993,
      lng: 90.404272,
    });
  });

  it("requires no authorization header", async () => {
    const res = await request(app).get("/zones");
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
