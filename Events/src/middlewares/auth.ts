import { Request, Response, NextFunction } from "express";
import { verify } from "../utils/jwt/jwt";
import { UserTypes, JwtPayload } from "../interfaces/jwtPayloads";
import { CacheService } from "../utils/cache/cacheService";
import { db } from "../database/kysely/databases";

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

// Admin authentication (Super Admin access)
export const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        message: "Admin access required"
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

// Organization authentication
export const organizationAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Verify organization exists and is approved
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

// Athlete authentication
export const athleteAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    
    if (!decoded || decoded.type !== UserTypes.ATHLETE) {
      res.status(403).json({
        success: false,
        message: "Athlete access required"
      });
      return;
    }

    // Check if this token exists in Redis cache (valid and not expired)
    const cachedToken = await CacheService.getCachedJWT(decoded.id, UserTypes.ATHLETE);
    if (cachedToken && cachedToken === token) {
      // Token is cached and valid, use it
      req.user = decoded;
      next();
      return;
    }

    // Verify athlete exists and is active
    const athlete = await db
      .selectFrom("affiliates")
      .select(["id", "status", "deleted"])
      .where("id", "=", decoded.id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!athlete || athlete.status !== "VERIFIED") {
      res.status(403).json({
        success: false,
        message: "Athlete account not verified"
      });
      return;
    }

    req.user = decoded;
    await CacheService.cacheJWT(decoded.id, UserTypes.ATHLETE, token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// Affiliate authentication (supports all sports professionals)
export const affiliateAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      // Token is cached and valid, use it
      req.user = decoded;
      next();
      return;
    }

    // Verify affiliate exists and is verified
    const affiliate = await db
      .selectFrom('affiliates')
      .select(['id', 'name', 'organizationId', 'status'])
      .where('id', '=', decoded.id)
      .where('deleted', '=', false)
      .executeTakeFirst();

    if (!affiliate || affiliate.status !== 'VERIFIED') {
      res.status(403).json({
        success: false,
        message: "Affiliate account not found or not verified"
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
