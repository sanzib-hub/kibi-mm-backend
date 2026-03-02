import { createClient, RedisClientType } from 'redis';

class RedisClient {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        connectTimeout: 20000
      }
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error('⚠️ Redis error:', err.message);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.warn('⚠️ Redis connection closed');
      this.isConnected = false;
    });
  }

  /* ---------- Connection ---------- */

  async connect(): Promise<void> {
    if (this.client.isOpen) return;
    try {
      await this.client.connect();
    } catch (err) {
      console.error('⚠️ Redis unavailable, continuing without cache');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }


  async ping(): Promise<string> {
  if (!this.isConnected) return 'NO_REDIS';
  return this.client.ping();
}

  /* ---------- OTP ---------- */

  async setOTP(phone: string, otp: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.setEx(`otp:${phone}`, 300, otp);
  }

  async getOTP(phone: string): Promise<string | null> {
    if (!this.isConnected) return null;
    return this.client.get(`otp:${phone}`);
  }

  async deleteOTP(phone: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(`otp:${phone}`);
  }

  async getOTPTTL(phone: string): Promise<number> {
    if (!this.isConnected) return -1;
    return this.client.ttl(`otp:${phone}`);
  }

  /* ---------- JWT ---------- */

  async setJWT(userId: string, userType: string, token: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.setEx(`jwt:${userType}:${userId}`, 3600, token);
  }

  async getJWT(userId: string, userType: string): Promise<string | null> {
    if (!this.isConnected) return null;
    return this.client.get(`jwt:${userType}:${userId}`);
  }

  async deleteJWT(userId: string, userType: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(`jwt:${userType}:${userId}`);
  }

  async getJWTTTL(userId: string, userType: string): Promise<number> {
    if (!this.isConnected) return -1;
    return this.client.ttl(`jwt:${userType}:${userId}`);
  }

  /* ---------- User Sessions ---------- */

  async setUserSession(userId: string, userType: string, data: any): Promise<void> {
    if (!this.isConnected) return;
    await this.client.setEx(
      `session:${userType}:${userId}`,
      3600,
      JSON.stringify(data)
    );
  }

  async getUserSession(userId: string, userType: string): Promise<any | null> {
    if (!this.isConnected) return null;
    const data = await this.client.get(`session:${userType}:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId: string, userType: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(`session:${userType}:${userId}`);
  }

  /* ---------- Rate Limiting ---------- */

  async incrementRateLimit(identifier: string, windowSeconds = 60): Promise<number> {
    if (!this.isConnected) return 0;
    const key = `rate_limit:${identifier}`;
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    return count;
  }
}

const redisClient = new RedisClient();
export default redisClient;
export { redisClient };
