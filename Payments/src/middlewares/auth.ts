import { Request, Response, NextFunction } from "express";
import { verify } from "../utils/jwt/jwt.js";
import { UserTypes, JwtPayload } from "../interfaces/jwtPayloads.js";
import { CacheService } from "../utils/cache/cacheService.js";
import { db } from "../database/kysely/databases.js";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Base authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access token required"
      });
      return;
    }

    const token = authHeader.substring(7);

    // First verify the token structure and get payload
    const decoded = verify(token);

    // Check if this token exists in Redis cache (valid and not expired)
    const cachedToken = await CacheService.getCachedJWT(decoded.id, decoded.type);
    if (cachedToken && cachedToken === token) {
      // Token is cached and valid, use it
      req.user = decoded;
      next();
      return;
    }

    // Token not in cache or doesn't match, verify normally
    // If verification succeeds, cache the token
    req.user = decoded;
    await CacheService.cacheJWT(decoded.id, decoded.type, token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// Organization only middleware
export const organizationOnly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access token required"
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verify(token);

    if (!decoded || decoded.type !== UserTypes.ORGANIZATION) {
      res.status(403).json({
        success: false,
        message: "Organization access required"
      });
      return;
    }

    // Check if this token exists in Redis cache (valid and not expired)
    const cachedToken = await CacheService.getCachedJWT(decoded.id, UserTypes.ORGANIZATION);
    if (cachedToken && cachedToken === token) {
      // Token is cached and valid, use it
      req.user = decoded;
      next();
      return;
    }

    // Token not in cache, verify organization exists and cache token
    const organization = await db
      .selectFrom("sports_organizations")
      .select(["id", "status", "deleted"])
      .where("id", "=", decoded.id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!organization) {
      res.status(403).json({
        success: false,
        message: "Organization not found"
      });
      return;
    }

    if (organization.status !== "APPROVED") {
      res.status(403).json({
        success: false,
        message: "Organization not approved yet"
      });
      return;
    }

    req.user = decoded;
    await CacheService.cacheJWT(decoded.id, UserTypes.ORGANIZATION, token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// Affiliate only middleware
export const affiliateOnly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access token required"
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verify(token);

    if (!decoded || (decoded.type !== UserTypes.AFFILIATE && decoded.type !== UserTypes.ATHLETE)) {
      res.status(403).json({
        success: false,
        message: "Affiliate access required"
      });
      return;
    }

    // Check if this token exists in Redis cache (valid and not expired)
    const cachedToken = await CacheService.getCachedJWT(decoded.id, decoded.type);
    if (cachedToken && cachedToken === token) {
      req.user = decoded;
      next();
      return;
    }

    // Token not in cache, verify affiliate exists and cache token
    const affiliate = await db
      .selectFrom("affiliates")
      .select(["id", "status", "deleted"])
      .where("id", "=", decoded.id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!affiliate) {
      res.status(403).json({
        success: false,
        message: "Affiliate not found"
      });
      return;
    }

    if (affiliate.status !== "VERIFIED") {
      res.status(403).json({
        success: false,
        message: "Affiliate account not verified"
      });
      return;
    }

    req.user = decoded;
    await CacheService.cacheJWT(decoded.id, decoded.type, token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// Rate limiter middleware
export const rateLimit = (maxRequests: number = 60, windowSeconds: number = 60) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      const result = await CacheService.checkRateLimit(identifier, maxRequests, windowSeconds);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later."
        });
        return;
      }

      next();
    } catch (error) {
      // If rate limiting fails, allow the request through
      next();
    }
  };
};
