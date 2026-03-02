import redisClient from '../redis/redis';
import { JwtPayload } from '../../interfaces/jwtPayloads';

export class CacheService {
  
  // OTP Caching (5 minutes expiry)
  static async cacheOTP(phone: string, otp: string): Promise<void> {
    try {
      await redisClient.setOTP(phone, otp);
      console.log(`OTP cached for ${phone} (5 min expiry)`);
    } catch (error) {
      console.error('Error caching OTP:', error);
    }
  }

  static async getCachedOTP(phone: string): Promise<string | null> {
    try {
      const otp = await redisClient.getOTP(phone);
      if (otp) {
        const ttl = await redisClient.getOTPTTL(phone);
        console.log(`OTP retrieved from cache for ${phone} (TTL: ${ttl}s)`);
      }
      return otp;
    } catch (error) {
      console.error('Error retrieving cached OTP:', error);
      return null;
    }
  }

  static async invalidateOTP(phone: string): Promise<void> {
    try {
      await redisClient.deleteOTP(phone);
      console.log(`OTP invalidated for ${phone}`);
    } catch (error) {
      console.error('Error invalidating OTP:', error);
    }
  }

  static async getOTPTimeRemaining(phone: string): Promise<number> {
    try {
      return await redisClient.getOTPTTL(phone);
    } catch (error) {
      console.error('Error getting OTP TTL:', error);
      return -1;
    }
  }

  // JWT Caching (1 hour expiry)
  static async cacheJWT(userId: number, userType: string, token: string): Promise<void> {
    try {
      await redisClient.setJWT(userId.toString(), userType, token);
      console.log(`JWT cached for user ${userId} (${userType}) - 1 hour expiry`);
    } catch (error) {
      console.error('Error caching JWT:', error);
    }
  }

  static async getCachedJWT(userId: number, userType: string): Promise<string | null> {
    try {
      const token = await redisClient.getJWT(userId.toString(), userType);
      if (token) {
        const ttl = await redisClient.getJWTTTL(userId.toString(), userType);
        console.log(`JWT retrieved from cache for user ${userId} (${userType}) - TTL: ${ttl}s`);
      }
      return token;
    } catch (error) {
      console.error('Error retrieving cached JWT:', error);
      return null;
    }
  }

  static async invalidateJWT(userId: number, userType: string): Promise<void> {
    try {
      await redisClient.deleteJWT(userId.toString(), userType);
      console.log(`JWT invalidated for user ${userId} (${userType})`);
    } catch (error) {
      console.error('Error invalidating JWT:', error);
    }
  }

  static async getJWTTimeRemaining(userId: number, userType: string): Promise<number> {
    try {
      return await redisClient.getJWTTTL(userId.toString(), userType);
    } catch (error) {
      console.error('Error getting JWT TTL:', error);
      return -1;
    }
  }

  // User Session Caching
  static async cacheUserSession(userId: number, userType: string, sessionData: any): Promise<void> {
    try {
      await redisClient.setUserSession(userId.toString(), userType, sessionData);
      console.log(`👤 Session cached for ${userType}:${userId}`);
    } catch (error) {
      console.error('Error caching user session:', error);
    }
  }

  static async getCachedUserSession(userId: number, userType: string): Promise<any | null> {
    try {
      const session = await redisClient.getUserSession(userId.toString(), userType);
      if (session) {
        console.log(`👤 Session retrieved from cache for ${userType}:${userId}`);
      }
      return session;
    } catch (error) {
      console.error('Error retrieving cached session:', error);
      return null;
    }
  }

  static async invalidateUserSession(userId: number, userType: string): Promise<void> {
    try {
      await redisClient.deleteUserSession(userId.toString(), userType);
      console.log(`👤 Session invalidated for ${userType}:${userId}`);
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  // Rate Limiting
  static async checkRateLimit(identifier: string, maxRequests: number = 10, windowSeconds: number = 60): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await redisClient.incrementRateLimit(identifier, windowSeconds);
      const allowed = current <= maxRequests;
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = Date.now() + (windowSeconds * 1000);

      if (!allowed) {
        console.log(`🚫 Rate limit exceeded for ${identifier}: ${current}/${maxRequests}`);
      }

      return { allowed, remaining, resetTime };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true, remaining: maxRequests, resetTime: Date.now() + (windowSeconds * 1000) };
    }
  }

  // Cache Health Check
  static async healthCheck(): Promise<{ status: string; connected: boolean; ping?: string }> {
    try {
      const connected = redisClient.getConnectionStatus();
      if (connected) {
        const ping = await redisClient.ping();
        return { status: 'healthy', connected: true, ping };
      } else {
        return { status: 'disconnected', connected: false };
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
      return { status: 'error', connected: false };
    }
  }

  // Utility method to generate cache keys
  static generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Bulk operations
  static async invalidateUserData(userId: number, userType: string): Promise<void> {
    try {
      await Promise.all([
        this.invalidateJWT(userId, userType),
        this.invalidateUserSession(userId, userType)
      ]);
      console.log(`🧹 All cached data cleared for ${userType}:${userId}`);
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }
}

export default CacheService;
