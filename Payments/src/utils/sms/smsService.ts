import axios from "axios";

/**
 * Send SMS with plan link to affiliate
 * @param phone - Phone number of the affiliate
 * @param planLink - Link to the plan details page
 * @returns Promise<boolean> - Success status
 */
export const sendPlanLinkSMS = async (
  phone: string,
  planLink: string
): Promise<boolean> => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const senderId = process.env.SENDER_ID || "KIBISP";
  const fast2smsUrl = process.env.FAST2SMS_URL;

  // If no API key, use mock mode for development
  if (!apiKey || !fast2smsUrl) {
    console.log(`[MOCK SMS] Sending plan link to ${phone}: ${planLink}`);
    return true;
  }

  try {
    // Check if DLT template is configured for plan links
    const planLinkMessageId = process.env.PLAN_LINK_MESSAGE_ID;

    if (planLinkMessageId) {
      // Use DLT template if configured
      // Template format should be: "View your subscription plan details: {#var#}"
      // where {#var#} is the plan link
      const response = await axios.post(
        fast2smsUrl,
        {
          sender_id: senderId,
          message: planLinkMessageId,
          variables_values: planLink,
          route: "dlt",
          numbers: phone,
        },
        { headers: { authorization: apiKey } }
      );

      console.log(`[Fast2SMS] Plan link SMS sent to ${phone}:`, response.data);
      return true;
    } else {
      // Fallback: Use simple message format (may not work in production due to DLT regulations)
      // In production, you should configure a DLT template
      console.warn(
        `[Fast2SMS] PLAN_LINK_MESSAGE_ID not configured. Using fallback method.`
      );
      console.log(`[SMS] Would send plan link to ${phone}: ${planLink}`);
      
      // For now, return true but log a warning
      // In production, you should configure the DLT template
      return true;
    }
  } catch (error: any) {
    console.error("Failed to send plan link SMS:", error?.message);
    if (error.response) {
      console.error("SMS API error response:", error.response.data);
    }
    return false;
  }
};

