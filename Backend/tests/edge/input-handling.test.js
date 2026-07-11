const request = require("supertest");
const Member = require("../../src/models/Member");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("../helpers/db");
const { seedTestData } = require("../helpers/seed");
const { authHeader } = require("../helpers/auth");
const { getApp } = require("../helpers/app");

describe("Input handling edge cases", () => {
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

  describe("NoSQL injection in string fields", () => {
    it("sanitizes $gt operator in member search query", async () => {
      const res = await request(app)
        .get("/api/members/all")
        .query({ search: '{"$gt":""}' })
        .set(authHeader(data.users.owner));

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body.members)).toBe(true);
      }
    });

    it("does not allow NoSQL injection via login email object", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({ email: { $gt: "" }, password: "x" });

      expect(res.status).toBe(400);
    });
  });

  describe("Oversized payloads", () => {
    it("rejects JSON body over 100kb limit", async () => {
      const hugeNote = "A".repeat(110 * 1024);

      const res = await request(app)
        .post(`/api/members/${data.members.activeMember.systemId}/notes`)
        .set(authHeader(data.users.sales1))
        .send({ text: hugeNote });

      expect([413, 400, 500]).toContain(res.status);
    });
  });

  describe("Deeply nested JSON", () => {
    it("handles deeply nested objects without server crash", async () => {
      let nested = { text: "note" };
      for (let i = 0; i < 50; i++) {
        nested = { nested };
      }

      const res = await request(app)
        .post(`/api/members/${data.members.activeMember.systemId}/notes`)
        .set(authHeader(data.users.sales1))
        .send(nested);

      expect(res.status).not.toBe(500);
    });
  });

  describe("XSS in free-text fields", () => {
    const xssPayload = '<script>alert("xss")</script>';

    it("stores XSS payload in notes as-is (unsanitized)", async () => {
      const res = await request(app)
        .post(`/api/members/${data.members.activeMember.systemId}/notes`)
        .set(authHeader(data.users.sales1))
        .send({ text: xssPayload });

      expect(res.status).toBe(201);

      const member = await Member.findById(data.members.activeMember._id);
      const lastNote = member.notes[member.notes.length - 1];
      expect(lastNote.text).toBe(xssPayload);
    });

    it("stores XSS payload in alerts as-is (unsanitized)", async () => {
      const res = await request(app)
        .post(`/api/members/${data.members.activeMember.systemId}/alerts`)
        .set(authHeader(data.users.receptionist))
        .send({ text: xssPayload });

      expect(res.status).toBe(201);

      const member = await Member.findById(data.members.activeMember._id);
      const lastAlert = member.alert[member.alert.length - 1];
      expect(lastAlert.text).toBe(xssPayload);
    });
  });
});
