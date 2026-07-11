const request = require("supertest");
const mongoose = require("mongoose");
const PackageExceptionRequest = require("../../src/models/PackageExceptionRequest");
const Member = require("../../src/models/Member");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("../helpers/db");
const { seedTestData } = require("../helpers/seed");
const { authHeader } = require("../helpers/auth");
const { getApp } = require("../helpers/app");

describe("Package exceptions workflow edge cases", () => {
  let app;
  let data;

  beforeAll(async () => {
    await connectTestDb();
    app = getApp();
  });

  beforeEach(async () => {
    await clearDatabase();
    data = await seedTestData();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function createPendingException(member = data.members.guest) {
    const res = await request(app)
      .post("/api/package-exceptions")
      .set(authHeader(data.users.salesManager))
      .send({
        memberId: String(member.systemId),
        basePackageId: data.packages.basicPkg._id.toString(),
        hasException: false,
        pricePaid: 1500,
      });
    expect(res.status).toBe(201);
    return res.body.request;
  }

  it("rejects double-processing (approve already approved exception)", async () => {
    const pending = await createPendingException();

    const first = await request(app)
      .put(`/api/package-exceptions/${pending._id}/status`)
      .set(authHeader(data.users.accountant))
      .send({ status: "accepted" });
    expect(first.status).toBe(200);

    const replay = await request(app)
      .put(`/api/package-exceptions/${pending._id}/status`)
      .set(authHeader(data.users.accountant))
      .send({ status: "rejected" });

    expect(replay.status).toBe(409);
    expect(replay.body.message).toMatch(/already processed/i);
  });

  it("rejects double-processing (reject already rejected exception)", async () => {
    const pending = await createPendingException();

    await request(app)
      .put(`/api/package-exceptions/${pending._id}/status`)
      .set(authHeader(data.users.accountant))
      .send({ status: "rejected" });

    const replay = await request(app)
      .put(`/api/package-exceptions/${pending._id}/status`)
      .set(authHeader(data.users.accountant))
      .send({ status: "accepted" });

    expect(replay.status).toBe(409);
  });

  it("returns 404 when Sales Manager proposes exception for non-existent member", async () => {
    const res = await request(app)
      .post("/api/package-exceptions")
      .set(authHeader(data.users.salesManager))
      .send({
        memberId: "99999",
        basePackageId: data.packages.basicPkg._id.toString(),
        hasException: false,
        pricePaid: 1500,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/member not found/i);
  });

  it("handles concurrent approvals on same exception (only one succeeds)", async () => {
    const pending = await createPendingException();

    const [res1, res2] = await Promise.all([
      request(app)
        .put(`/api/package-exceptions/${pending._id}/status`)
        .set(authHeader(data.users.accountant))
        .send({ status: "accepted" }),
      request(app)
        .put(`/api/package-exceptions/${pending._id}/status`)
        .set(authHeader(data.users.accountant))
        .send({ status: "accepted" }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const final = await PackageExceptionRequest.findById(pending._id);
    expect(final.status).toBe("accepted");

    const member = await Member.findById(data.members.guest._id);
    const newSubs = member.subscriptions?.length || 0;
    expect(newSubs).toBeLessThanOrEqual(1);
  });

  it("returns 404 for invalid ObjectId member reference in exception", async () => {
    const res = await request(app)
      .post("/api/package-exceptions")
      .set(authHeader(data.users.salesManager))
      .send({
        memberId: new mongoose.Types.ObjectId().toString(),
        basePackageId: data.packages.basicPkg._id.toString(),
        hasException: false,
        pricePaid: 1500,
      });

    expect(res.status).toBe(404);
  });
});
