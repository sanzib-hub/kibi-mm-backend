import dotenv from "dotenv";
dotenv.config();
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { JwtPayload } from "../../interfaces/jwtPayloads";

const JWT_SECRET: Secret | undefined = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in environment variables");
}

// Function that accepts a payload and expiry time, then returns a JWT token
export const sign = (payload: JwtPayload, expiry: number | string = "7d") => {
  // @ts-ignore - Bypassing JWT overload type issues
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiry });
};

// Function that accepts a JWT token and returns the payload
export const verify = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
