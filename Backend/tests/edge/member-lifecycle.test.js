const request = require("supertest");
const Member = require("../../src/models/Member");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("../helpers/db");
const { seedTestData } = require("../helpers/seed");
const { authHeader } = require("../helpers/auth");
const { getApp } = require("../helpers/app");

describe("Member lifecycle edge cases", () => {
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

  describe("Guest/member creation validation", () => {
    it("rejects guest with missing name", async () => {
      const res = await request(app)
        .post("/api/members")
        .set(authHeader(data.users.receptionist))
        .send({ phones: "01099998888" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });

    it("rejects guest with invalid phone (too short)", async () => {
      const res = await request(app)
        .post("/api/members")
        .set(authHeader(data.users.receptionist))
        .send({ name: "Bad Phone", phones: "123" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });

    it("rejects guest with invalid source enum", async () => {
      const res = await request(app)
        .post("/api/members")
        .set(authHeader(data.users.receptionist))
        .send({ name: "Bad Source", phones: "01099998888", source: "billboard" });
      expect(res.status).toBe(400);
    });
  });

  describe("Concurrent ID generation", () => {
    it("creates 10 concurrent guests with unique systemIds (no race 500s)", async () => {
      const payload = (n) => ({
        name: `Race Guest ${n}`,
        phones: `0105555${String(n).padStart(4, "0")}`,
      });

      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          request(app)
            .post("/api/members")
            .set(authHeader(data.users.receptionist))
            .send(payload(i))
        )
      );

      const successes = results.filter((r) => r.status === 201);
      const failures = results.filter((r) => r.status !== 201);

      expect(failures.map((r) => ({ status: r.status, body: r.body }))).toEqual([]);
      expect(successes.length).toBe(10);

      const systemIds = successes.map((r) => r.body.member.systemId);
      expect(new Set(systemIds).size).toBe(10);
    });
  });

  describe("Package assignment on active subscription", () => {
    it("rejects overlapping package start while subscription is active", async () => {
      const member = data.members.activeMember;

      const res = await request(app)
        .post(`/api/members/${member.systemId}/package`)
        .set(authHeader(data.users.accountant))
        .send({
          packageId: data.packages.premiumPkg._id.toString(),
          name: "Premium Quarterly",
          duration: "3 months",
          pricePaid: 4000,
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/start date must be on or after|active subscription/i);
    });

    it("allows renewal scheduled on/after current package end date", async () => {
      const member = data.members.activeMember;
      const currentEnd = new Date(member.subscriptions[0].endDate);

      const res = await request(app)
        .post(`/api/members/${member.systemId}/package`)
        .set(authHeader(data.users.accountant))
        .send({
          packageId: data.packages.premiumPkg._id.toString(),
          name: "Premium Quarterly",
          duration: "3 months",
          pricePaid: 4000,
          startDate: currentEnd.toISOString(),
        });

      expect(res.status).toBe(200);
    });
  });

  describe("Freeze operations", () => {
    it("rejects freezing a member already frozen", async () => {
      const res = await request(app)
        .patch(`/api/members/${data.members.frozenMember.systemId}/freeze`)
        .set(authHeader(data.users.salesManager))
        .send({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/status is "frozen"/i);
    });

    it("rejects freeze beyond package freeze limit", async () => {
      const res = await request(app)
        .patch(`/api/members/${data.members.activeMember.systemId}/freeze`)
        .set(authHeader(data.users.salesManager))
        .send({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/freeze limit exceeded/i);
    });
  });

  describe("Block / unblock", () => {
    it("rejects blocking an already blocked member", async () => {
      await Member.findByIdAndUpdate(data.members.activeMember._id, { isBlocked: true });

      const res = await request(app)
        .patch(`/api/members/${data.members.activeMember.systemId}/block`)
        .set(authHeader(data.users.salesManager))
        .send({ reason: "test" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already blocked/i);
    });

    it("rejects unblocking a member who was never blocked", async () => {
      const res = await request(app)
        .patch(`/api/members/${data.members.activeMember.systemId}/unblock`)
        .set(authHeader(data.users.salesManager));

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not blocked/i);
    });
  });

  describe("Check-in edge cases", () => {
    it("rejects check-in for expired member", async () => {
      const res = await request(app)
        .post(`/api/members/${data.members.expiredMember.systemId}/checkin`)
        .set(authHeader(data.users.receptionist));

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });

    it("allows check-in for frozen member (ends freeze early)", async () => {
      const res = await request(app)
        .post(`/api/members/${data.members.frozenMember.systemId}/checkin`)
        .set(authHeader(data.users.receptionist));

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("active");
    });
  });
});
