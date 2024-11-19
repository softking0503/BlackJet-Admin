const request = require("supertest");
const app = require("../../index");
const mongoose = require("mongoose");
const {
  successResponse,
  notFoundResponse,
  internalServerError,
} = require("../../helpers/response");
const membershipModal = require("../../models/membership");
const priceModal = require("../../models/price");
const discountModal = require("../../models/discount");
const shortCodeModal = require("../../models/shortCode");

jest.mock("../../models/membership");
jest.mock("../../models/price");
jest.mock("../../models/discount");
jest.mock("../../models/shortCode");

let adminToken;

beforeAll(async () => {
  // Log in to get the admin token
  const loginResponse = await request(app)
    .post("/admin/login")
    .send({ username: "admin", password: "password" });
  adminToken = loginResponse.body.token;
});

beforeEach(() => {
  // Clear mocks before each test
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.connection.close(); // Close the database connection after all tests
});

describe("GET /admin/membership", () => {
  it("should successfully return membership details with price and discount information", async () => {
    const mockMembership = {
      _id: "membershipId",
      name: "Gold Membership",
      content: "Exclusive benefits for gold members.",
      text: "Join the gold membership for exclusive discounts and offers.",
      status: "active",
      type: 1,
      highlightsArray: [{ highlight: "Priority Support" }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrices = [
      {
        price: 100,
        initiationFees: 10,
        effectiveDate: new Date(),
      },
    ];

    const mockDiscounts = [
      {
        initiation_fees: 5,
        smallestDiscount: { discount_price: 80, used_seats: 20 },
      },
    ];

    const mockShortCodes = [
      {
        shortCodeName: "PRICE",
        details: [{ tableName: "unused", keyName: "latestPrice" }],
      },
    ];

    // Mock the model methods
    membershipModal.findOne.mockResolvedValue(mockMembership);
    priceModal.find.mockResolvedValue(mockPrices);
    discountModal.find.mockResolvedValue(mockDiscounts);
    shortCodeModal.find.mockResolvedValue(mockShortCodes);

    const response = await request(app)
      .get("/admin/membership")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ id: "membershipId" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Membership Retrieved Successfully");
    expect(response.body.data._id).toBe(mockMembership._id);
    expect(response.body.data.latestPrice).toBe("100");
    expect(response.body.data.discountPrice).toBe("80");
    expect(response.body.data.usedSeats).toBe(20);
  });

  it("should return 404 if membership is not found", async () => {
    membershipModal.findOne.mockResolvedValue(null); // Membership not found

    const response = await request(app)
      .get("/admin/membership")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ id: "nonExistingId" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Membership not found");
  });

  it("should return 404 if price data is not found", async () => {
    const mockMembership = {
      _id: "membershipId",
      name: "Gold Membership",
      content: "Exclusive benefits for gold members.",
      status: "active",
      type: 1,
    };

    membershipModal.findOne.mockResolvedValue(mockMembership);
    priceModal.find.mockResolvedValue([]); // No price data found

    const response = await request(app)
      .get("/admin/membership")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ id: "membershipId" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Price not found");
  });

  it("should return 500 if an internal error occurs", async () => {
    // Simulate a database error or unexpected issue
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    membershipModal.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .get("/admin/membership")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ id: "membershipId" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal Server Error");

    errorSpy.mockRestore();
  });
});
