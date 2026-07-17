const request = require("supertest");
const Notification = require("../../src/models/Notification");
const SalesRepRequest = require("../../src/models/SalesRepRequest");
const Member = require("../../src/models/Member");
const { connectTestDb, clearDatabase, disconnectTestDb } = require("../helpers/db");
const { seedTestData } = require("../helpers/seed");
const { authHeader } = require("../helpers/auth");
const { getApp } = require("../helpers/app");

describe("Notifications edge cases", () => {
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

    it("marks old assignment notification read after member is reassigned", async () => {
    const createRes = await request(app)
      .post("/api/sales-requests")
      .set(authHeader(data.users.sales1))
      .send({ memberId: String(data.members.guest.systemId) });
    expect(createRes.status).toBe(201);

    const requestId = createRes.body.request._id;

    const approveRes = await request(app)
      .put(`/api/sales-requests/${requestId}/status`)
      .set(authHeader(data.users.salesManager))
      .send({ status: "accepted" });
    expect(approveRes.status).toBe(200);

    const notifBefore = await Notification.findOne({
      recipient: data.users.sales1._id,
      type: "member_assigned",
    });
    expect(notifBefore).toBeTruthy();
    expect(notifBefore.read).toBe(false);

    const transfer = await request(app)
      .put(`/api/members/${data.members.guest.systemId}/sales-rep`)
      .set(authHeader(data.users.salesManager))
      .send({ newSalesRepId: data.users.sales2._id.toString() });
    expect(transfer.status).toBe(200);

    const member = await Member.findById(data.members.guest._id);
    expect(member.assignedSales.toString()).toBe(data.users.sales2._id.toString());

    const staleNotif = await Notification.findById(notifBefore._id);
    expect(staleNotif.read).toBe(true);
  });

  it("Sales rep can still fetch notifications endpoint after reassignment", async () => {
    await SalesRepRequest.create({
      member: data.members.guest._id,
      requestedBy: data.users.sales1._id,
      status: "accepted",
    });

    await Member.findByIdAndUpdate(data.members.guest._id, {
      assignedSales: data.users.sales2._id,
    });

    const res = await request(app)
      .get("/api/notifications")
      .set(authHeader(data.users.sales1));

    expect(res.status).toBe(200);
  });
});
