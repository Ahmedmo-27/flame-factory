const User = require("../../src/models/User");
const Package = require("../../src/models/Package");
const Member = require("../../src/models/Member");
const { hashPassword } = require("../../src/utils/passwordUtils");

const TEST_PASSWORD = "password123";

function calcEndDate(startDate, duration) {
  const end = new Date(startDate);
  switch (duration) {
    case "1 month":
      end.setMonth(end.getMonth() + 1);
      break;
    case "3 months":
      end.setMonth(end.getMonth() + 3);
      break;
    case "6 months":
      end.setMonth(end.getMonth() + 6);
      break;
    case "1 year":
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      break;
  }
  return end;
}

async function seedTestData() {
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const owner = await User.create({
    name: "Test Owner",
    email: "owner@test.com",
    role: "Owner",
    password: passwordHash,
  });

  const salesManager = await User.create({
    name: "Test Sales Manager",
    email: "sales.manager@test.com",
    role: "Sales Manager",
    password: passwordHash,
  });

  const sales1 = await User.create({
    name: "Ahmed Sales",
    email: "sales1@test.com",
    role: "Sales",
    password: passwordHash,
  });

  const sales2 = await User.create({
    name: "Sara Sales",
    email: "sales2@test.com",
    role: "Sales",
    password: passwordHash,
  });

  const accountant = await User.create({
    name: "Test Accountant",
    email: "accountant@test.com",
    role: "Accountant",
    password: passwordHash,
  });

  const coach = await User.create({
    name: "Test Coach",
    email: "coach@test.com",
    role: "Coach",
    password: passwordHash,
  });

  const receptionist = await User.create({
    name: "Test Receptionist",
    email: "receptionist@test.com",
    role: "Receptionist",
    password: passwordHash,
  });

  const basicPkg = await Package.create({
    name: "Basic Monthly",
    activityType: "gym",
    duration: "1 month",
    price: 1500,
    freezeLimitDays: 7,
    invitationLimit: 2,
    isActive: true,
    createdBy: salesManager._id,
  });

  const premiumPkg = await Package.create({
    name: "Premium Quarterly",
    activityType: "gym",
    duration: "3 months",
    price: 4000,
    freezeLimitDays: 14,
    invitationLimit: 3,
    isActive: true,
    createdBy: salesManager._id,
  });

  const startDate = new Date();
  const activeMember = await Member.create({
    memberId: 1,
    systemId: 100,
    name: "Karim Hassan",
    phones: "01012345678",
    assignedSales: sales1._id,
    source: "Walk in",
    status: "active",
    isMember: true,
    createdBy: salesManager._id,
    subscriptions: [
      {
        subscriptionId: 100,
        package: basicPkg._id,
        startDate,
        endDate: calcEndDate(startDate, "1 month"),
        pricePaid: basicPkg.price,
        discountPercent: 0,
        isRenewal: false,
        createdBy: salesManager._id,
        approvedBy: accountant._id,
      },
    ],
  });

  const otherRepMember = await Member.create({
    memberId: 2,
    systemId: 101,
    name: "Mona Ali",
    phones: "01098765432",
    assignedSales: sales2._id,
    source: "Social media",
    status: "active",
    isMember: true,
    createdBy: salesManager._id,
    subscriptions: [
      {
        subscriptionId: 101,
        package: premiumPkg._id,
        startDate,
        endDate: calcEndDate(startDate, "3 months"),
        pricePaid: premiumPkg.price,
        discountPercent: 0,
        isRenewal: false,
        createdBy: salesManager._id,
        approvedBy: accountant._id,
      },
    ],
  });

  const guest = await Member.create({
    memberId: null,
    systemId: 102,
    name: "Youssef Ibrahim",
    phones: "01122334455",
    assignedSales: null,
    source: "sales call",
    status: "guest",
    isMember: false,
    createdBy: salesManager._id,
  });

  const expiredMember = await Member.create({
    memberId: 3,
    systemId: 103,
    name: "Expired User",
    phones: "01211111111",
    assignedSales: sales1._id,
    source: "Walk in",
    status: "expired",
    isMember: true,
    createdBy: salesManager._id,
    subscriptions: [
      {
        subscriptionId: 102,
        package: basicPkg._id,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-02-01"),
        pricePaid: basicPkg.price,
        discountPercent: 0,
        isRenewal: false,
        createdBy: salesManager._id,
        approvedBy: accountant._id,
      },
    ],
  });

  const frozenMember = await Member.create({
    memberId: 4,
    systemId: 104,
    name: "Frozen User",
    phones: "01222222222",
    assignedSales: sales1._id,
    source: "Walk in",
    status: "frozen",
    isMember: true,
    freezeDaysUsed: 3,
    createdBy: salesManager._id,
    freeze: [
      {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 86400000),
        createdBy: salesManager._id,
      },
    ],
    subscriptions: [
      {
        subscriptionId: 103,
        package: basicPkg._id,
        startDate,
        endDate: calcEndDate(startDate, "1 month"),
        pricePaid: basicPkg.price,
        discountPercent: 0,
        isRenewal: false,
        createdBy: salesManager._id,
        approvedBy: accountant._id,
      },
    ],
  });

  return {
    password: TEST_PASSWORD,
    users: {
      owner,
      salesManager,
      sales1,
      sales2,
      accountant,
      coach,
      receptionist,
    },
    packages: { basicPkg, premiumPkg },
    members: {
      activeMember,
      otherRepMember,
      guest,
      expiredMember,
      frozenMember,
    },
  };
}

module.exports = { seedTestData, TEST_PASSWORD, calcEndDate };
