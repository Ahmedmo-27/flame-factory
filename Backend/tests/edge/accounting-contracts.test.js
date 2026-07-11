const request = require("supertest");
const Member = require("../../src/models/Member");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("../helpers/db");
const { seedTestData } = require("../helpers/seed");
const { authHeader } = require("../helpers/auth");
const { getApp } = require("../helpers/app");

describe("Accounting / contracts edge cases", () => {
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

  describe("Contract entry amounts", () => {
    it("allows zero-amount package assignment (pricePaid = 0)", async () => {
      const res = await request(app)
        .post(`/api/members/${data.members.guest.systemId}/package`)
        .set(authHeader(data.users.accountant))
        .send({
          packageId: data.packages.basicPkg._id.toString(),
          name: "Basic Monthly",
          duration: "1 month",
          pricePaid: 0,
        });

      expect(res.status).toBe(200);
    });

    it("rejects negative pricePaid via validation", async () => {
      const res = await request(app)
        .post(`/api/members/${data.members.guest.systemId}/package`)
        .set(authHeader(data.users.accountant))
        .send({
          packageId: data.packages.basicPkg._id.toString(),
          name: "Basic Monthly",
          duration: "1 month",
          pricePaid: -100,
        });

      expect(res.status).toBe(400);
    });
  });

  describe("Contract creation for blocked/deleted member", () => {
    it("allows package assign to blocked member", async () => {
      await Member.findByIdAndUpdate(data.members.guest._id, {
        isBlocked: true,
        blockedReason: "test block",
      });

      const res = await request(app)
        .post(`/api/members/${data.members.guest.systemId}/package`)
        .set(authHeader(data.users.accountant))
        .send({
          packageId: data.packages.basicPkg._id.toString(),
          name: "Basic Monthly",
          duration: "1 month",
          pricePaid: 1500,
        });

      expect(res.status).toBe(200);
    });

    it("returns 404 when assigning package to deleted member", async () => {
      const systemId = data.members.guest.systemId;
      await Member.deleteOne({ _id: data.members.guest._id });

      const res = await request(app)
        .post(`/api/members/${systemId}/package`)
        .set(authHeader(data.users.accountant))
        .send({
          packageId: data.packages.basicPkg._id.toString(),
          name: "Basic Monthly",
          duration: "1 month",
          pricePaid: 1500,
        });

      expect(res.status).toBe(404);
    });
  });

  describe("Contracts pagination (/api/accounting/contracts)", () => {
    it("clamps page 0 to page 1", async () => {
      const res = await request(app)
        .get("/api/accounting/contracts?page=0")
        .set(authHeader(data.users.accountant));

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });

    it("clamps negative page to page 1", async () => {
      const res = await request(app)
        .get("/api/accounting/contracts?page=-5")
        .set(authHeader(data.users.accountant));

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });

    it("caps huge page size at maxLimit (100)", async () => {
      const res = await request(app)
        .get("/api/accounting/contracts?limit=99999")
        .set(authHeader(data.users.accountant));

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(100);
    });
  });
});
