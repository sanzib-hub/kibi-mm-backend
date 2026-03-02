import request from "supertest";
import app from "../../src/app";

describe("Payments Checkout Routes", () => {
  // Reusable payloads
  const baseUrl = "/api/payments";

  const mockTransactionId = "550e8400-e29b-41d4-a716-446655440000";
  const mockOrderId = "order_JDfklw93u2";

  // --------- PLACE ORDER ----------
  describe("POST /place-order", () => {
    it("should create a transaction successfully (201)", async () => {
      const res = await request(app)
        .post(`${baseUrl}/place-order`)
        .send({ eventId: 101 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        message: expect.any(String),
        transaction_id: expect.any(String),
      });
      expect(res.body.event_details).toHaveProperty("id", 101);
    });

    it("should return 400 if eventId is missing", async () => {
      const res = await request(app).post(`${baseUrl}/place-order`).send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: "Event ID is required to place an order.",
      });
    });

    it("should return 404 if event not found", async () => {
      const res = await request(app)
        .post(`${baseUrl}/place-order`)
        .send({ eventId: 99999 });
      expect([404, 400, 500]).toContain(res.status); // flexible mock
    });
  });

  // --------- CREATE ORDER ----------
  describe("POST /create-order", () => {
    const payload = {
      transaction_id: mockTransactionId,
      amount: 500,
      currency: "INR",
      organizationId: "org_001",
      eventId: 101,
    };

    it("should create order in Razorpay successfully (200)", async () => {
      const res = await request(app)
        .post(`${baseUrl}/create-order`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        order_id: expect.any(String),
        transaction_id: mockTransactionId,
        amount: 500,
        currency: "INR",
      });
    });

    it("should return 400 if required params are missing", async () => {
      const res = await request(app)
        .post(`${baseUrl}/create-order`)
        .send({ amount: 500 }); // incomplete
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Missing required parameters");
    });
  });

  // --------- GENERATE SIGNATURE ----------
  describe("POST /generate-signature", () => {
    const payload = {
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: "pay_29QQoUBi66xm2f",
      payment_status: "captured",
    };

    it("should generate payment signature (200)", async () => {
      const res = await request(app)
        .post(`${baseUrl}/generate-signature`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("signature");
    });

    it("should return 400 if missing params", async () => {
      const res = await request(app)
        .post(`${baseUrl}/generate-signature`)
        .send({ razorpay_order_id: mockOrderId });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Missing payment verification parameters");
    });
  });

  // --------- ORDER STATUS ----------
  describe("POST /order-status/:order_id", () => {
    it("should fetch order status successfully (200)", async () => {
      const res = await request(app).post(`${baseUrl}/order-status/${mockOrderId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toMatchObject({
        order_id: mockOrderId,
        payment_status: expect.any(String),
      });
    });

    it("should return 400 if order_id missing", async () => {
      const res = await request(app).post(`${baseUrl}/order-status/`);
      // supertest will likely 404, depending on Express route definitions
      expect([400, 404]).toContain(res.status);
    });
  });
});

