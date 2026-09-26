import request from "supertest";
import { app } from "../../app";

jest.mock("../../db/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("GET /health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
