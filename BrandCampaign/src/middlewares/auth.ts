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

// Admin authentication (Super Admin access) - for campaign management
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

    // Verify admin exists and is active
    const admin = await db
      .selectFrom("super_admin")
      .select(["id", "active", "deleted"])
      .where("id", "=", decoded.id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!admin || !admin.active) {
      res.status(403).json({
        success: false,
        message: "Admin account not found or inactive"
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

// Affiliate authentication (supports all sports professionals) - for campaign registration
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
    // Get organizationId from affiliate_organizations join table (first organization if multiple exist)
    const affiliate = await db
      .selectFrom('affiliates')
      .leftJoin(
        'affiliate_organizations',
        (join) => 
          join
            .onRef('affiliate_organizations.affiliateId', '=', 'affiliates.id')
            .on('affiliate_organizations.deleted', '=', false)
      )
      .select([
        'affiliates.id',
        'affiliates.name',
        'affiliate_organizations.organizationId',
        'affiliates.status'
      ])
      .where('affiliates.id', '=', decoded.id)
      .where('affiliates.deleted', '=', false)
      .orderBy('affiliate_organizations.createdAt', 'asc')
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

// Sponsorship Team authentication
export const sponsorshipTeamAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    
    if (!decoded || decoded.type !== UserTypes.SPONSORSHIP_TEAM) {
      res.status(403).json({
        success: false,
        message: "Sponsorship team access required"
      });
      return;
    }

    // Check if this token exists in Redis cache (valid and not expired)
    const cachedToken = await CacheService.getCachedJWT(decoded.id, UserTypes.SPONSORSHIP_TEAM);
    if (cachedToken && cachedToken === token) {
      // Token is cached and valid, use it
      req.user = decoded;
      next();
      return;
    }

    // Verify sponsorship team member exists and is active
    const sponsorshipTeam = await db
      .selectFrom("sponsorship_team")
      .select(["id", "active", "deleted"])
      .where("id", "=", decoded.id)
      .where("deleted", "=", false)
      .executeTakeFirst();

    if (!sponsorshipTeam || !sponsorshipTeam.active) {
      res.status(403).json({
        success: false,
        message: "Sponsorship team account not found or inactive"
      });
      return;
    }

    req.user = decoded;
    await CacheService.cacheJWT(decoded.id, UserTypes.SPONSORSHIP_TEAM, token);
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
