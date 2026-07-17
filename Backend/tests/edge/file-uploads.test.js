const fs = require("fs");
const path = require("path");
const request = require("supertest");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("../helpers/db");
const { seedTestData } = require("../helpers/seed");
const { authHeader } = require("../helpers/auth");
const { getApp } = require("../helpers/app");

describe("File upload edge cases", () => {
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

  describe("Invitation ID upload (multer + magic bytes)", () => {
    it("rejects file exceeding 5MB with 413", async () => {
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
      bigBuffer[0] = 0xff;
      bigBuffer[1] = 0xd8;
      bigBuffer[2] = 0xff;

      const res = await request(app)
        .post(`/api/members/${data.members.activeMember.systemId}/invitations`)
        .set(authHeader(data.users.receptionist))
        .field("invitedName", "Big File Guest")
        .attach("idFile", bigBuffer, {
          filename: "big.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(413);
      expect(res.body.message).toMatch(/file too large/i);
    });

    it("rejects disguised PHP file renamed to .jpg (magic-byte validation)", async () => {
      const phpPayload = Buffer.from("<?php echo 'pwned'; ?>");

      const res = await request(app)
        .post(`/api/members/${data.members.activeMember.systemId}/invitations`)
        .set(authHeader(data.users.receptionist))
        .field("invitedName", "Spoof Guest")
        .attach("idFile", phpPayload, {
          filename: "evil.jpg",
          contentType: "image/jpeg",
        });

      if (res.status === 201) {
        throw new Error("FINDING: disguised PHP accepted as JPEG on invitation upload");
      }

      expect([400, 500]).toContain(res.status);
    });

    it("accepts genuine JPEG upload", async () => {
      const jpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);

      const res = await request(app)
        .post(`/api/members/${data.members.activeMember.systemId}/invitations`)
        .set(authHeader(data.users.receptionist))
        .field("invitedName", "Real JPEG Guest")
        .attach("idFile", jpeg, {
          filename: "valid.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(201);
    });
  });

  describe("National ID upload (Accountant)", () => {
    it("rejects disguised PHP file via magic-byte check", async () => {
      const phpPayload = Buffer.from("<?php echo 'pwned'; ?>");

      const res = await request(app)
        .patch(`/api/members/${data.members.activeMember.systemId}/national-id`)
        .set(authHeader(data.users.accountant))
        .attach("nationalIdFile", phpPayload, {
          filename: "id.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/does not match allowed types|content/i);
    });

    it("stores basename only for genuine JPEG national ID", async () => {
      const jpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);

      const res = await request(app)
        .patch(`/api/members/${data.members.activeMember.systemId}/national-id`)
        .set(authHeader(data.users.accountant))
        .attach("nationalIdFile", jpeg, {
          filename: "id.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(res.body.nationalId).toMatch(/\.jpg$/);
      expect(res.body.nationalId).not.toContain("/");
    });
  });

  describe("/uploads static access", () => {
    it("returns 401 without auth when guessing upload filename", async () => {
      const uploadsDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const testFile = path.join(uploadsDir, "edge-test-secret.jpg");
      fs.writeFileSync(testFile, Buffer.from([0xff, 0xd8, 0xff]));

      const res = await request(app).get("/uploads/edge-test-secret.jpg");
      expect(res.status).toBe(401);

      fs.unlinkSync(testFile);
    });

    it("returns 404 for authenticated user when file does not exist", async () => {
      const res = await request(app)
        .get("/uploads/nonexistent-guessed-file.jpg")
        .set(authHeader(data.users.receptionist));

      expect(res.status).toBe(404);
    });
  });
});
