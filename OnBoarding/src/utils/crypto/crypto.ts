import bcrypt from "bcrypt";
import { randomBytes, randomInt } from "crypto";

const SALT_ROUNDS = 12;

export const hash = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const compare = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateOTP = (): string => {
  return randomInt(100000, 999999).toString();
};

export const generateInvitationCode = (length: number = 6): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "KIBI-";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(0, chars.length));
  }
  return result;
};

export const generateSecureToken = (length: number = 32): string => {
  return randomBytes(length).toString("hex");
};
