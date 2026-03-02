// tests/events/eventsRoutes.test.ts
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import * as dbModule from "../../src/database/kysely/databases";
import { UserTypes } from "../../src/interfaces/jwtPayloads";
import {
  getEventsByOrganization,
  createEvent,
} from "../../src/controllers/events/eventsController";

// ------------------------
// Express App Setup
// ------------------------
const app = express();
app.use(express.json());

// ------------------------
// Helpers
// ------------------------
const futureDate = (daysFromNow = 7) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
};

const makeValidEventPayload = (
  overrides: Partial<Record<string, any>> = {}
) => ({
  name: "KIBI Premier League 2025",
  description: "Annual inter-state cricket tournament",
  startDate: futureDate(30),
  endDate: futureDate(45),
  startTime: "09:00",
  participationFee: 1500,
  venue: "Main Cricket Ground",
  address: "Jawaharlal Nehru Stadium",
  mapLink: "https://maps.google.com/?q=Jawaharlal+Nehru+Stadium",
  organizerEmail: "organizer@kibisports.com",
  organizationName: "KIBI Sports Federation",
  organizerPhoneNumber: "+91-9876543210",
  imageUrl: "https://example.com/banner.jpg",
  eventType: "National",
  formId: 9001,
  ...overrides,
});

const extractEventFromRes = (res: any) =>
  res.body?.data ?? res.body?.event ?? res.body;

// ------------------------
// Fake Data
// ------------------------
const fakeEvents = [
  { id: 1, name: "Event 1", deleted: false },
  { id: 2, name: "Event 2", deleted: false },
];

const fakeEvent = { id: 1, name: "KIBI Premier League 2025" };

// ------------------------
// Middleware Mock
// ------------------------
const mockOrgAuthMiddleware = (
  req: Partial<Request> & { user?: any },
  res: Response,
  next: NextFunction
) => {
  req.user = { id: 101, type: UserTypes.ORGANIZATION };
  next();
};

// ------------------------
// DB Mock
// ------------------------
const mockTransaction = {
  insertInto: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  executeTakeFirstOrThrow: vi.fn(async () => fakeEvent),
};

const mockQueryBuilder = {
  selectFrom: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  execute: vi.fn(async () => fakeEvents),
  executeTakeFirst: vi.fn(async () => ({ id: 101, name: "Test Organization" })),
  transaction: vi.fn().mockReturnValue({
    execute: vi.fn(async (fn) => fn(mockTransaction)),
  }),
};

vi.spyOn(dbModule, "db", "get").mockReturnValue(mockQueryBuilder as any);

// ------------------------
// Routes Mount
// ------------------------
app.get(
  "/api/events/organization",
  mockOrgAuthMiddleware,
  getEventsByOrganization
);
app.post("/api/events", mockOrgAuthMiddleware, createEvent);

// ------------------------
// Tests
// ------------------------
describe("Events Routes", () => {
  let createdEventId: number | string | null = null;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/events")
      .send(makeValidEventPayload());
    if ([200, 201].includes(res.status)) {
      const ev = extractEventFromRes(res);
      createdEventId = ev?.id ?? null;
    } else {
      createdEventId = null;
    }
  });

  afterAll(async () => {
    if (createdEventId) {
      await request(app).delete(`/api/events/${createdEventId}`);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------- GET /api/events/organization ----------
  describe("GET /api/events/organization", () => {
    it("returns events successfully (200)", async () => {
      const res = await request(app).get("/api/events/organization");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.organizationName).toBe("Test Organization");
      expect(res.body.data).toEqual(fakeEvents);
    });

    it("returns 201 if no events found", async () => {
      (mockQueryBuilder.execute as vi.Mock).mockResolvedValueOnce([]);
      const res = await request(app).get("/api/events/organization");
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("returns 400 for invalid organization ID", async () => {
      const invalidAuth = (
        req: Partial<Request> & { user?: any },
        res: Response,
        next: NextFunction
      ) => {
        req.user = { id: NaN, type: UserTypes.ORGANIZATION };
        next();
      };
      app.get(
        "/api/events/organization-invalid",
        invalidAuth,
        getEventsByOrganization
      );
      const res = await request(app).get("/api/events/organization-invalid");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 if organization not found", async () => {
      (mockQueryBuilder.executeTakeFirst as vi.Mock).mockResolvedValueOnce(
        undefined
      );
      const res = await request(app).get("/api/events/organization");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("returns 500 on server error", async () => {
      (mockQueryBuilder.execute as vi.Mock).mockImplementationOnce(() => {
        throw new Error("Database failure");
      });
      const res = await request(app).get("/api/events/organization");
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Database failure");
    });
  });

  // ---------- POST /api/events ----------
  describe("POST /api/events", () => {
    it("creates an event successfully (201)", async () => {
      (mockQueryBuilder.executeTakeFirst as vi.Mock)
        .mockResolvedValueOnce(undefined) // duplicate check
        .mockResolvedValueOnce({ id: 101 }) // org exists
        .mockResolvedValueOnce({ id: 9001 }); // form exists

      const res = await request(app)
        .post("/api/events")
        .send(makeValidEventPayload());
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeEvent);
    });

    it("fails validation (400) if required fields missing", async () => {
      const payload = { ...makeValidEventPayload() };
      delete (payload as any).name;
      const res = await request(app).post("/api/events").send(payload);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/required/i);
    });

    it("fails if duplicate event exists (400)", async () => {
      (mockQueryBuilder.executeTakeFirst as vi.Mock).mockResolvedValueOnce({
        id: 1,
      });
      const res = await request(app)
        .post("/api/events")
        .send(makeValidEventPayload());
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("returns 500 on transaction error", async () => {
      (mockQueryBuilder.transaction as vi.Mock).mockImplementationOnce(() => {
        throw new Error("Transaction failed");
      });
      const res = await request(app)
        .post("/api/events")
        .send(makeValidEventPayload());
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
