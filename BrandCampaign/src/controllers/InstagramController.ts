import { Request, Response, NextFunction } from "express";
import { InstagramService } from "../services/InstagramService";
import { ConnectInstagramDto } from "../dtos/instagram.dto";

/**
 * Controller class for Instagram endpoints
 */
export class InstagramController {
  constructor(private instagramService: InstagramService) {}

  /**
   * Connect Instagram account
   */
  connectInstagram = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { fbAccessToken } = req.body;

      if (!fbAccessToken) {
        res.status(400).json({
          success: false,
          message: "fbAccessToken is required",
        });
        return;
      }

      const dto: ConnectInstagramDto = { fbAccessToken };
      const result = await this.instagramService.connectInstagram(userId, dto);

      res.json(result);
    } catch (error: any) {
      console.error("❌ IG CONNECT ERROR:", error.response?.data || error.message);
      next(error);
    }
  };

  /**
   * Get Instagram account details
   */
  getInstagramDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;

      const result = await this.instagramService.getInstagramDetails(userId);

      if (!result) {
        res.json({
          success: true,
          result: null,
          message: "No Instagram account connected",
        });
        return;
      }

      res.json({
        success: true,
        result,
      });
    } catch (error: any) {
      console.error("IG FETCH ERROR:", error.message);
      next(error);
    }
  };

  /**
   * Delete Instagram account data
   */
  deleteInstagramAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user!.id;

      const result = await this.instagramService.deleteInstagramAccount(userId);

      return res.json(result);
    } catch (error: any) {
      console.error("IG DELETE ERROR:", error.message);
      return next(error);
    }
  };
}

