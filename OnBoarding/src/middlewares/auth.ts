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

// Super Admin only middleware
export const superAdminOnly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    
    if (!decoded || decoded.type !== UserTypes.SUPER_ADMIN) {
      res.status(403).json({
        success: false,
        message: "Super Admin access required"
      });
      return;
    }

    // Check if this token exists in Redis cache (valid and not expired)
    const cachedToken = await CacheService.getCachedJWT(decoded.id, UserTypes.SUPER_ADMIN);
    if (cachedToken && cachedToken === token) {
      // Token is cached and valid, use it
      req.user = decoded;
      next();
      return;
    }

    // Token not in cache, verify user exists and cache token
    const superAdmin = await db
      .selectFrom("super_admin")
      .select(["id", "active", "deleted"])
      .where("id", "=", decoded.id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!superAdmin || !superAdmin.active) {
      res.status(403).json({
        success: false,
        message: "Super Admin account inactive"
      });
      return;
    }

    req.user = decoded;
    await CacheService.cacheJWT(decoded.id, UserTypes.SUPER_ADMIN, token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed"
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
    
    if (!decoded || decoded.type !== UserTypes.AFFILIATE) {
      res.status(403).json({
        success: false,
        message: "Affiliate access required"
      });
      return;
    }

    // Check if this token exists in Redis cache (valid and not expired)
    const cachedToken = await CacheService.getCachedJWT(decoded.id, UserTypes.AFFILIATE);
    if (cachedToken && cachedToken === token) {
      // Token is cached and valid, use it
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

    if (!affiliate || affiliate.status !== "VERIFIED") {
      res.status(403).json({
        success: false,
        message: "Affiliate account not verified"
      });
      return;
    }

    req.user = decoded;
    await CacheService.cacheJWT(decoded.id, UserTypes.AFFILIATE, token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// Multi-role middleware - accepts multiple user types
export const multiRole = (allowedRoles: UserTypes[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      
      if (!decoded || !allowedRoles.includes(decoded.type)) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(", ")}`
        });
        return;
      }

      // Check if this token exists in Redis cache (valid and not expired)
      const cachedToken = await CacheService.getCachedJWT(decoded.id, decoded.type);
      if (cachedToken && cachedToken === token) {
        // Token is cached and valid, use it
        req.user = decoded;
        next();
        return;
      }

      // Token not in cache, cache it and proceed
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
};
