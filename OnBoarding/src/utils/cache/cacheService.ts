import redisClient from "../redis/redis.js";

export class CacheService {

  /* ---------- OTP ---------- */
  // One phone = one OTP (Redis overwrites automatically)

  static async cacheOTP(phone: string, otp: string): Promise<void> {
    try {
      await redisClient.setOTP(phone, otp); // overwrites old OTP
      console.log(`OTP cached for ${phone}`);
    } catch (error) {
      console.error("Error caching OTP:", error);
    }
  }

  static async getCachedOTP(phone: string): Promise<string | null> {
    try {
      return await redisClient.getOTP(phone);
    } catch (error) {
      console.error("Error retrieving cached OTP:", error);
      return null;
    }
  }

  static async invalidateOTP(phone: string): Promise<void> {
    try {
      await redisClient.deleteOTP(phone);
      console.log(`OTP invalidated for ${phone}`);
    } catch (error) {
      console.error("Error invalidating OTP:", error);
    }
  }

  static async getOTPTimeRemaining(phone: string): Promise<number> {
    try {
      return await redisClient.getOTPTTL(phone);
    } catch (error) {
      console.error("Error getting OTP TTL:", error);
      return -1;
    }
  }

  /* ---------- JWT ---------- */

  static async cacheJWT(
    userId: number,
    userType: string,
    token: string
  ): Promise<void> {
    try {
      await redisClient.setJWT(userId.toString(), userType, token);
    } catch (error) {
      console.error("Error caching JWT:", error);
    }
  }

  static async getCachedJWT(
    userId: number,
    userType: string
  ): Promise<string | null> {
    try {
      return await redisClient.getJWT(userId.toString(), userType);
    } catch (error) {
      console.error("Error retrieving cached JWT:", error);
      return null;
    }
  }

  static async invalidateJWT(
    userId: number,
    userType: string
  ): Promise<void> {
    try {
      await redisClient.deleteJWT(userId.toString(), userType);
    } catch (error) {
      console.error("Error invalidating JWT:", error);
    }
  }

  /* ---------- Sessions ---------- */

  static async cacheUserSession(
    userId: number,
    userType: string,
    sessionData: any
  ): Promise<void> {
    try {
      await redisClient.setUserSession(
        userId.toString(),
        userType,
        sessionData
      );
    } catch (error) {
      console.error("Error caching user session:", error);
    }
  }

  static async getCachedUserSession(
    userId: number,
    userType: string
  ): Promise<any | null> {
    try {
      return await redisClient.getUserSession(
        userId.toString(),
        userType
      );
    } catch (error) {
      console.error("Error retrieving cached session:", error);
      return null;
    }
  }

  static async invalidateUserSession(
    userId: number,
    userType: string
  ): Promise<void> {
    try {
      await redisClient.deleteUserSession(
        userId.toString(),
        userType
      );
    } catch (error) {
      console.error("Error invalidating session:", error);
    }
  }
}

export default CacheService;
