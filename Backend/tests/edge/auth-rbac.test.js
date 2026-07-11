const request = require("supertest");
const jwt = require("jsonwebtoken");
const Member = require("../../src/models/Member");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("../helpers/db");
const { seedTestData, TEST_PASSWORD } = require("../helpers/seed");
const { authHeader, expiredToken } = require("../helpers/auth");
const { getApp } = require("../helpers/app");
const { clearLoginFailures, MAX_FAILURES } = require("../../src/middleware/loginLockout");

describe("Auth & RBAC edge cases", () => {
  let app;
  let data;

  beforeAll(async () => {
    await connectTestDb();
    app = getApp();
  });

  beforeEach(async () => {
    await clearDatabase();
    data = await seedTestData();
    clearLoginFailures("sales1@test.com");
    clearLoginFailures("nonexistent@test.com");
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe("Login lockout", () => {
    it("locks account after MAX_FAILURES wrong passwords", async () => {
      const email = "sales1@test.com";

      for (let i = 0; i < MAX_FAILURES; i++) {
        const res = await request(app)
          .post("/api/users/login")
          .send({ email, password: "wrong-password" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid email or password/i);
      }

      const locked = await request(app)
        .post("/api/users/login")
        .send({ email, password: "wrong-password" });

      expect(locked.status).toBe(429);
      expect(locked.body.message).toMatch(/locked/i);
      expect(locked.body.lockedUntil).toBeDefined();
    });

    it("locks unknown email after MAX_FAILURES failed attempts", async () => {
      const email = "nonexistent@test.com";
      clearLoginFailures(email);

      for (let i = 0; i < MAX_FAILURES; i++) {
        const res = await request(app)
          .post("/api/users/login")
          .send({ email, password: "wrong" });
        expect(res.status).toBe(400);
      }

      const locked = await request(app)
        .post("/api/users/login")
        .send({ email, password: "wrong" });
      expect(locked.status).toBe(429);
      expect(locked.body.message).toMatch(/locked/i);
    });
  });

  describe("JWT on protected routes", () => {
    it("returns 401 when JWT is missing", async () => {
      const res = await request(app).get("/api/members");
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no token/i);
    });

    it("returns 401 for malformed JWT", async () => {
      const res = await request(app)
        .get("/api/members")
        .set("Authorization", "Bearer not.a.valid.jwt");
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token failed/i);
    });

    it("returns 401 for expired JWT", async () => {
      const token = expiredToken(data.users.sales1);
      const res = await request(app)
        .get("/api/members")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token failed/i);
    });

    it("returns 401 (not 500) for valid signature but deleted user", async () => {
      const token = jwt.sign(
        { id: "507f1f77bcf86cd799439011", role: "Sales" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      const res = await request(app)
        .get("/api/members")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/user not found/i);
    });
  });

  describe("Role-based access", () => {
    it("Coach token gets 403 on Owner-only register route", async () => {
      const res = await request(app)
        .post("/api/users/register")
        .set(authHeader(data.users.coach))
        .send({ name: "Hacker", email: "hack@test.com", password: "password123" });
      expect(res.status).toBe(403);
    });

    it("Coach token gets 403 on Accountant-only package assign", async () => {
      const res = await request(app)
        .post(`/api/members/${data.members.guest.systemId}/package`)
        .set(authHeader(data.users.coach))
        .send({
          packageId: data.packages.basicPkg._id.toString(),
          name: "Basic Monthly",
          duration: "1 month",
          pricePaid: 1500,
        });
      expect(res.status).toBe(403);
    });

    it("Coach token gets 403 on accounting contracts", async () => {
      const res = await request(app)
        .get("/api/accounting/contracts")
        .set(authHeader(data.users.coach));
      expect(res.status).toBe(403);
    });
  });

  describe("Sales request route aliases", () => {
    it("/api/sales-requests and /api/requests enforce identical GET role checks", async () => {
      const salesRes = await request(app)
        .get("/api/sales-requests")
        .set(authHeader(data.users.sales1));
      const aliasRes = await request(app)
        .get("/api/requests")
        .set(authHeader(data.users.sales1));

      expect(salesRes.status).toBe(200);
      expect(aliasRes.status).toBe(200);
    });

    it("both aliases reject Receptionist with 403", async () => {
      const salesRes = await request(app)
        .get("/api/sales-requests")
        .set(authHeader(data.users.receptionist));
      const aliasRes = await request(app)
        .get("/api/requests")
        .set(authHeader(data.users.receptionist));

      expect(salesRes.status).toBe(403);
      expect(aliasRes.status).toBe(403);
      expect(salesRes.body.message).toBe(aliasRes.body.message);
    });

    it("both aliases allow Sales POST with same validation", async () => {
      const guest2 = await Member.create({
        systemId: 200,
        name: "Second Guest",
        phones: "01088887777",
        status: "guest",
        isMember: false,
        createdBy: data.users.salesManager._id,
      });

      const payload1 = { memberId: String(data.members.guest.systemId) };
      const payload2 = { memberId: String(guest2.systemId) };

      const salesRes = await request(app)
        .post("/api/sales-requests")
        .set(authHeader(data.users.sales1))
        .send(payload1);
      const aliasRes = await request(app)
        .post("/api/requests")
        .set(authHeader(data.users.sales2))
        .send(payload2);

      expect(salesRes.status).toBe(201);
      expect(aliasRes.status).toBe(201);
    });
  });

  describe("Sales rep PII redaction", () => {
    it("strips phone for member NOT assigned to requesting sales rep", async () => {
      const res = await request(app)
        .get(`/api/members/${data.members.otherRepMember.systemId}`)
        .set(authHeader(data.users.sales1));

      expect(res.status).toBe(200);
      expect(res.body.member.phones).toBeNull();
      expect(res.body.member).not.toHaveProperty("phones", "01098765432");
    });

    it("includes phone for member assigned to requesting sales rep", async () => {
      const res = await request(app)
        .get(`/api/members/${data.members.activeMember.systemId}`)
        .set(authHeader(data.users.sales1));

      expect(res.status).toBe(200);
      expect(res.body.member.phones).toBe("01012345678");
    });
  });
});
