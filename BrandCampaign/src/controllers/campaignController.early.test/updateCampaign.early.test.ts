import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { CampaignController } from "../CampaignController";
import { CampaignService } from "../../services/CampaignService";
import { NotFoundError } from "../../utils/errors/AppError";

// Mock classes for dependencies
class MockCampaignService {
  public updateCampaign = vi.fn();
}

// Create a mock schema instance
const mockUpdateCampaignSchemaInstance = {
  validate: vi.fn(),
};

// Mock Request and Response
const mockRequest = (data: Partial<Request>): Request => data as any;
const mockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext = (): NextFunction => {
  return vi.fn() as unknown as NextFunction;
};

// Mock the schema module
vi.mock("../../utils/campaignSchema", () => ({
  updateCampaignSchema: mockUpdateCampaignSchemaInstance,
}));

describe("updateCampaign() updateCampaign method", () => {
  let mockCampaignService: MockCampaignService;
  let campaignController: CampaignController;
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    // Re-initialize mocks before each test
    mockCampaignService = new MockCampaignService();

    // Create controller instance with mocked service
    campaignController = new CampaignController(mockCampaignService as any);

    req = mockRequest({
      params: { id: "1" },
      body: { name: "Updated Campaign", budget: 1000 },
    });
    res = mockResponse();
    next = mockNext();
    vi.clearAllMocks();
  });

  // ------------------- Happy Paths -------------------
  describe("Happy paths", () => {
    it("should update campaign successfully and return 200", async () => {
      // This test ensures a successful update returns the correct response

      // Mock schema validation to succeed
      vi.mocked(mockUpdateCampaignSchemaInstance.validate).mockReturnValue({
        error: undefined,
        value: { name: "Updated Campaign", budget: 1000 },
      } as any);

      // Mock service to return updated campaign
      vi.mocked(mockCampaignService.updateCampaign).mockResolvedValue({
        id: 1,
        name: "Updated Campaign",
        budget: 1000,
      } as any);

      await campaignController.updateCampaign(req, res, next);

      expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith(1, {
        name: "Updated Campaign",
        budget: 1000,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Campaign updated successfully",
        data: { id: 1, name: "Updated Campaign", budget: 1000 },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should update campaign with minimal valid fields", async () => {
      // This test ensures the update works with minimal required fields

      req.body = { name: "Minimal" };

      vi.mocked(mockUpdateCampaignSchemaInstance.validate).mockReturnValue({
        error: undefined,
        value: { name: "Minimal" },
      } as any);

      vi.mocked(mockCampaignService.updateCampaign).mockResolvedValue({
        id: 1,
        name: "Minimal",
      } as any);

      await campaignController.updateCampaign(req, res, next);

      expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith(1, {
        name: "Minimal",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Campaign updated successfully",
        data: { id: 1, name: "Minimal" },
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ------------------- Edge Cases -------------------
  describe("Edge cases", () => {
    it("should return 400 if campaignId is not a number", async () => {
      // This test ensures invalid campaignId returns 400

      req.params.id = "abc";

      await campaignController.updateCampaign(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid campaign ID",
      });
      expect(mockCampaignService.updateCampaign).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 if validation fails", async () => {
      // This test ensures validation errors are handled

      vi.mocked(mockUpdateCampaignSchemaInstance.validate).mockReturnValue({
        error: {
          details: [{ message: "Name is required" }, { message: "Budget must be a number" }],
        },
        value: {},
      } as any);

      await campaignController.updateCampaign(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Validation error",
        details: ["Name is required", "Budget must be a number"],
      });
      expect(mockCampaignService.updateCampaign).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 404 if campaign does not exist", async () => {
      // This test ensures a missing campaign returns 404

      vi.mocked(mockUpdateCampaignSchemaInstance.validate).mockReturnValue({
        error: undefined,
        value: { name: "Updated Campaign", budget: 1000 },
      } as any);

      vi.mocked(mockCampaignService.updateCampaign).mockRejectedValue(
        new NotFoundError("Campaign not found")
      );

      await campaignController.updateCampaign(req, res, next);

      // Error should be passed to next() middleware
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should return 500 if an unexpected error is thrown", async () => {
      // This test ensures that unexpected errors are caught and passed to next()

      vi.mocked(mockUpdateCampaignSchemaInstance.validate).mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      await campaignController.updateCampaign(req, res, next);

      // Error should be passed to next() middleware
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle campaignId of 0", async () => {
      // This test ensures campaignId of 0 is processed (controller doesn't reject 0, only NaN)
      // Note: If business logic requires 0 to be invalid, that should be handled in the service layer

      req.params.id = "0";

      vi.mocked(mockUpdateCampaignSchemaInstance.validate).mockReturnValue({
        error: undefined,
        value: { name: "Updated Campaign" },
      } as any);

      vi.mocked(mockCampaignService.updateCampaign).mockResolvedValue({
        id: 0,
        name: "Updated Campaign",
      } as any);

      await campaignController.updateCampaign(req, res, next);

      expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith(0, {
        name: "Updated Campaign",
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle campaignId as empty string as invalid", async () => {
      // This test ensures empty string campaignId is invalid

      req.params.id = "";

      await campaignController.updateCampaign(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid campaign ID",
      });
      expect(mockCampaignService.updateCampaign).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
