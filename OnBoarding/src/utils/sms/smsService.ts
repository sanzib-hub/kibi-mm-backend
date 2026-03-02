import axios from "axios";

// SMS Service for OTP and notifications
export interface SMSService {
  sendOTP(phone: string, otp: string): Promise<boolean>;
  sendInvitation(
    phone: string,
    invitationCode: string,
    organizationName?: string
  ): Promise<boolean>;
}

// Mock SMS service for development
export class MockSMSService implements SMSService {
  async sendOTP(phone: string, otp: string): Promise<boolean> {
    console.log(`[MOCK SMS] Sending OTP ${otp} to ${phone}`);
    return true;
  }

  async sendInvitation(
    phone: string,
    invitationCode: string,
    organizationName?: string
  ): Promise<boolean> {
    const playStoreLink =
      "https://play.google.com/store/apps/details?id=com.kibisportsapp";
    const message = organizationName
      ? `You've been invited to join ${organizationName} on KIBI Sports. Use invitation code: ${invitationCode}. Download the app: ${playStoreLink}`
      : `You've been approved for KIBI Sports. Use invitation code: ${invitationCode}. Download the app: ${playStoreLink}`;

    console.log(`[MOCK SMS] Sending invitation to ${phone}: ${message}`);
    return true;
  }
}

// Fast2SMS implementation (can be enabled with API key)
export class Fast2SMSService implements SMSService {
  private apiKey: string;
  private senderId: string;

  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || "";
    this.senderId = process.env.SENDER_ID || "KIBISP";
  }

  async sendOTP(phone: string, otp: string): Promise<boolean> {
    if (!this.apiKey) {
      return new MockSMSService().sendOTP(phone, otp);
    }

    try {
      // Android app hash for SMS Retriever API (11-character string)
      // Generated on the Android side from package name (com.kibisportsapp)
      // and signing certificate, then set as ANDROID_OTP_HASH_CODE in env.
      const androidHashCode = process.env.ANDROID_OTP_HASH_CODE || "";
      const hasHash = androidHashCode.length === 11;

      // DLT templates:
      // 1) OTP_MESSAGE_ID (1 var): "<#> {#var#} is your KIBI Sports verification code. Valid for 10 minutes."
      //    var1 = OTP
      // 2) OTP_MESSAGE_ID_WITH_HASH (2 vars):
      //    "<#> {#var#} is your KIBI Sports verification code. Valid for 10 minutes. {#var#}"
      //    var1 = OTP, var2 = Android hash
      //
      // Choose template + variables based on whether we have a hash.
      const messageId =
        hasHash && process.env.OTP_MESSAGE_ID_WITH_HASH
          ? process.env.OTP_MESSAGE_ID_WITH_HASH
          : process.env.OTP_MESSAGE_ID;

      const variables_values = hasHash
        ? `${otp.toString()}|${androidHashCode}` // var1=OTP, var2=hash
        : `${otp.toString()}`; // only OTP

      const response = await axios.post(
        process.env.FAST2SMS_URL || "",
        {
          sender_id: process.env.SENDER_ID || this.senderId,
          message: messageId,
          variables_values,
          route: "dlt",
          numbers: phone,
        },
        { headers: { authorization: this.apiKey } }
      );
      console.log("SMS sent successfully:", response.data);

      if (hasHash) {
        console.log(
          `[Fast2SMS] Sending OTP ${otp} to ${phone} with hash ${androidHashCode} for autofill`
        );
      } else {
        console.log(
          `[Fast2SMS] Sending OTP ${otp} to ${phone} (autofill disabled – ANDROID_OTP_HASH_CODE not set or invalid)`
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to send OTP:", error);
      return false;
    }
  }

  async sendInvitation(
    phone: string,
    invitationCode: string,
    organizationName?: string
  ): Promise<boolean> {
    console.log("inside fast2sms service");
    if (!this.apiKey) {
      console.log("api key found", this.apiKey);
      console.log("[Fast2SMS] API key not configured, using mock service");
      return new MockSMSService().sendInvitation(
        phone,
        invitationCode,
        organizationName
      );
    }
    try {
      const playStoreLink =
        "https://play.google.com/store/apps/details?id=com.kibisportsapp";
      const message = organizationName
        ? `You've been invited to join ${organizationName} on KIBI Sports. Use code: ${invitationCode}. Download the app: ${playStoreLink}`
        : `You've been approved for KIBI Sports. Use code: ${invitationCode}. Download the app: ${playStoreLink}`;

      console.log(`[Fast2SMS] Sending invitation to ${phone}: ${message}`);

      const inviterName =
        organizationName && organizationName.trim().length > 0
          ? organizationName
          : "KIBI Sports"; // fallback if org name is missing

      // Order must match the template: {#var#} (inviter) then {#var#} (code)
      const variables_values = `${inviterName}|${invitationCode}`;

      const response = await axios.post(
        process.env.FAST2SMS_URL || "",
        {
          sender_id: process.env.SENDER_ID,
          message: process.env.UNAFFILIATE_MESSAGE_ID, // Fast2SMS message_id
          variables_values,
          route: "dlt",
          numbers: phone,
        },
        { headers: { authorization: process.env.FAST2SMS_API_KEY } }
      );

      console.log("SMS sent successfully:", response.data);

      return true;
    } catch (error) {
      console.error("Failed to send invitation:", error);
      return false;
    }
  }
}

// SMS service factory
export const createSMSService = (): SMSService => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (apiKey) {
    return new Fast2SMSService();
  }

  return new MockSMSService();
};

export const sendSMSNotification = async ({
  phone,
  inviteCode,
}: {
  phone: string;
  inviteCode: string;
}): Promise<boolean> => {
  console.log(`Sending invite code to ${phone}: ${inviteCode}`);
  console.log("Inside sendSMSNotification function");
  try {
    const response = await axios.post(
      process.env.FAST2SMS_URL || "",
      {
        sender_id: process.env.SENDER_ID,
        message: process.env.UNAFFILIATE_MESSAGE_ID,
        route: "dlt",
        numbers: phone,
        // matches: "You have been invited by {#var#} ... Invite Code: {#var#} ..."
        variables_values: `KIBI Sports|${inviteCode}`,
      },
      { headers: { authorization: process.env.FAST2SMS_API_KEY } }
    );
    console.log("SMS sent successfully:", response.data);

    return true;
  } catch (error: any) {
    console.error("SMS notification error:", error?.message);
    throw new Error(`Failed to send SMS: ${error?.message}`);
  }
};
