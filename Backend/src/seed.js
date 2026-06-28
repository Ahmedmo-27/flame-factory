require("dotenv").config();
const mongoose = require("mongoose");
const connectMongo = require("./config/connectMongo");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Package = require("./models/Package");
const Member = require("./models/Member");
const SalesRepRequest = require("./models/SalesRepRequest");

const TEST_PASSWORD = "password123";

const USERS = [
  {
    name: "Sales Manager",
    email: "sales.manager@test.com",
    role: "Sales Manager",
  },
  {
    name: "Ahmed Sales",
    email: "sales1@test.com",
    role: "Sales",
  },
  {
    name: "Sara Sales",
    email: "sales2@test.com",
    role: "Sales",
  },
  {
    name: "Omar Sales",
    email: "sales3@test.com",
    role: "Sales",
    abilities: {
      canCommentOnMembers: true,
      canRequestAssignment: false,
      canRequestTakeover: false,
    },
  },
];

async function upsertUser({ name, email, role, passwordHash, abilities }) {
  const update = { name, email, role, password: passwordHash };
  if (abilities) update.abilities = abilities;
  return User.findOneAndUpdate(
    { email },
    update,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function seed() {
  try {
    await connectMongo();
  } catch (error) {
    console.error("Seed failed:", error.message);
    if (error.message?.includes("whitelist") || error.message?.includes("timed out")) {
      console.error(
        "Tip: In MongoDB Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for testing)."
      );
    }
    process.exit(1);
  }

  // Remove legacy unique index that blocks multiple members without memberId
  try {
    await Member.collection.dropIndex("memberId_1");
    console.log("Dropped stale memberId index");
  } catch (err) {
    if (err.code !== 27 && err.codeName !== "IndexNotFound") {
      console.warn("Could not drop memberId index:", err.message);
    }
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const users = {};
  for (const user of USERS) {
    const doc = await upsertUser({ ...user, passwordHash });
    users[user.email] = doc;
    console.log(`✓ ${user.role}: ${user.email}`);
  }

  const manager = users["sales.manager@test.com"];
  const sales1 = users["sales1@test.com"];
  const sales2 = users["sales2@test.com"];

  const packages = await Promise.all([
    Package.findOneAndUpdate(
      { name: "Basic Monthly" },
      {
        name: "Basic Monthly",
        type: "monthly",
        price: 1500,
        durationMonths: 1,
        isActive: true,
        createdBy: manager._id,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ),
    Package.findOneAndUpdate(
      { name: "Premium Quarterly" },
      {
        name: "Premium Quarterly",
        type: "quarterly",
        price: 4000,
        durationMonths: 3,
        isActive: true,
        createdBy: manager._id,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ),
  ]);

  const [basicPkg, premiumPkg] = packages;

  const memberSeeds = [
    {
      name: "Karim Hassan",
      phones: "01012345678",
      salesRep: sales1._id,
      package: basicPkg._id,
      Type: "Walk in",
      status: "active",
      notes: [{ text: "Interested in morning sessions.", createdBy: sales1._id }],
    },
    {
      name: "Mona Ali",
      phones: "01098765432",
      salesRep: sales2._id,
      package: premiumPkg._id,
      Type: "Social media",
      status: "active",
      notes: [{ text: "Referred by existing member.", createdBy: sales2._id }],
    },
    {
      name: "Youssef Ibrahim",
      phones: "01122334455",
      salesRep: null,
      package: basicPkg._id,
      Type: "sales call",
      status: "active",
    },
    {
      name: "Nour Mahmoud",
      phones: "01233445566",
      salesRep: sales2._id,
      package: premiumPkg._id,
      Type: "referal",
      status: "active",
    },
  ];

  const members = {};
  for (const seed of memberSeeds) {
    const doc = await Member.findOneAndUpdate(
      { phones: seed.phones },
      { ...seed, createdBy: manager._id },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    members[seed.name] = doc;
    console.log(`✓ Member: ${seed.name}`);
  }

  // Pending takeover request: sales1 wants Nour (assigned to sales2)
  await SalesRepRequest.findOneAndUpdate(
    { member: members["Nour Mahmoud"]._id, requestedBy: sales1._id, status: "pending" },
    {
      member: members["Nour Mahmoud"]._id,
      requestedBy: sales1._id,
      status: "pending",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  console.log("✓ Pending request: sales1 → Nour Mahmoud (takeover from sales2)");

  console.log("\n--- Test accounts (password for all: password123) ---");
  console.log("Sales Manager : sales.manager@test.com");
  console.log("Sales Rep 1   : sales1@test.com  (Ahmed - has Karim assigned)");
  console.log("Sales Rep 2   : sales2@test.com  (Sara - has Mona & Nour assigned)");
  console.log("Sales Rep 3   : sales3@test.com  (Omar - request abilities disabled)");
  console.log("\nSample data:");
  console.log("- Youssef Ibrahim is unassigned (request assignment as any sales rep)");
  console.log("- Nour Mahmoud has a pending takeover request from sales1");
  console.log("---------------------------------------------------\n");

  await mongoose.disconnect();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
