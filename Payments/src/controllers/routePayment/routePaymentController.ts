import dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";
import { createStakeholder } from "../../utils/razorpaySettlement/razorpaySettlement.js";
import { requestProductConfiguration, RequestProductConfiguration } from "../../utils/razorpaySettlement/razorpaySettlement.js";
import { updateProductConfiguration, UpdateProductConfiguration } from "../../utils/razorpaySettlement/razorpaySettlement.js";
import { db } from "../../database/kysely/databases.js";

// --------------------------
const validateField = (name: string, value: string): string => {
  const strValue = value.trim();

  switch (name) {
    case "name":
      if (!strValue) return "Name is required";
      if (strValue.length > 255) return "Name cannot exceed 255 characters";
      if (!/^[A-Za-z\s]+$/.test(strValue))
        return "Name must contain only letters and spaces";
      break;

    case "email":
      if (!strValue) return "Please enter your email address.";
      if (!/\S+@\S+\.\S+/.test(strValue))
        return "Please enter a valid email address (e.g., name@example.com).";
      const [localPart = "", domainPart = ""] = strValue.split("@");
      if (localPart.length > 64)
        return "The part before '@' in your email is too long (max 64 characters).";
      if (domainPart.length > 68)
        return "The part after '@' in your email is too long (max 68 characters).";
      if (strValue.length > 132)
        return "Your email address is too long (max 132 characters).";
      break;

    case "percentage_ownership":
      if (!strValue) return "Percentage ownership is required";
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(strValue))
        return "Enter a valid percentage (e.g., 87.55)";
      const num = parseFloat(strValue);
      if (num < 0 || num > 100)
        return "Percentage ownership must be between 0 and 100";
      break;

    case "phone":
      if (!strValue) return "Phone number is required";
      if (!/^(\+91)?[6-9]\d{9}$/.test(strValue))
        return "Enter a valid Indian phone number";
      break;

    case "street":
      if (!strValue) return "Please enter your street address.";
      if (strValue.length < 10)
        return "Street address must be at least 10 characters long.";
      if (strValue.length > 255)
        return "Street address cannot exceed 255 characters.";
      break;

    case "pincode":
      if (!strValue) return "Pincode is required";
      if (!/^\d{6}$/.test(strValue)) return "Enter a valid 6-digit pincode";
      break;

    case "pan":
      if (!strValue) return "Please enter the stakeholder's PAN number.";
      const pan = strValue.toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        return "PAN must be a 10-character alphanumeric code (e.g., AVOPB1234X).";
      }
      if (pan[3] !== "P") {
        return "The 4th character of the PAN must be 'P' for stakeholders.";
      }
      break;

    default:
      break;
  }

  return "";
};

// ✅ Updated Razorpay Error Parser
const parseRazorpayError = (error: any): string => {
  try {
    // Try to extract Razorpay-style error object safely
    const razorpayError = error?.error || error?.response?.data?.error || error;

    // 1️⃣ If Razorpay gives a specific `description`, show it directly
    if (razorpayError?.description) {
      return razorpayError.description;
    }

    // 2️⃣ If error has nested validation info (some prod errors do)
    if (razorpayError?.data && Array.isArray(razorpayError.data)) {
      const firstError = razorpayError.data[0];
      if (firstError?.description) return firstError.description;
    }

    // 3️⃣ Handle known Razorpay error codes
    if (razorpayError?.code) {
      switch (razorpayError.code) {
        case "BAD_REQUEST_ERROR":
          // Example: "PAN already exists" or "Invalid state"
          if (razorpayError.description)
            return razorpayError.description;
          return "Invalid request to Razorpay. Please check the entered details.";

        case "VALIDATION_ERROR":
          if (razorpayError.field && razorpayError.description) {
            return `${razorpayError.field}: ${razorpayError.description}`;
          }
          return razorpayError.description || "Validation failed. Please check your details.";

        case "SERVER_ERROR":
          return "Razorpay server error. Please try again later.";

        default:
          return razorpayError.description || "Unexpected Razorpay error occurred.";
      }
    }

    // 4️⃣ Fallbacks for common issues (if description missing)
    const message = razorpayError?.message || error?.message || error.toString();

    if (message.includes("exists") || message.includes("duplicate")) {
      return "This stakeholder already exists. Please verify email, phone, or PAN.";
    }

    if (message.includes("PAN") || message.includes("pan")) {
      return "Invalid or duplicate PAN. Please provide a valid PAN (e.g., AVOPB1234X).";
    }

    if (message.includes("account") && (message.includes("not found") || message.includes("null"))) {
      return "Account not found. Please verify your account ID.";
    }

    // 5️⃣ Final fallback (show Razorpay’s full message)
    return message || "An unexpected error occurred while processing with Razorpay.";
  } catch (err) {
    return "Something went wrong while processing the Razorpay error.";
  }
};



export const createStakeholders = async (req: Request, res: Response) => {
  try {
    const { account_id } = req.params;
    const stakeholderPayload = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: account_id in URL",
      });
    }

    if (!stakeholderPayload || Object.keys(stakeholderPayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Stakeholder payload is required in body",
      });
    }

    // -----------------------------
    // Normalize phone for Razorpay
    // -----------------------------
    if (stakeholderPayload.phone && stakeholderPayload.phone.primary) {
      let primary = String(stakeholderPayload.phone.primary).trim();

      // Remove +91 or 91 prefix for Razorpay
      if (primary.startsWith("+91")) {
        primary = primary.slice(3);
      } else if (primary.startsWith("91") && primary.length > 10) {
        primary = primary.slice(2);
      }

      // Validate length
      if (primary.length < 8 || primary.length > 11 || !/^\d+$/.test(primary)) {
        return res.status(400).json({
          success: false,
          message:
            "Primary phone number for Razorpay must be 8–11 digits without country code",
        });
      }

      stakeholderPayload.phone.primary = primary;

      // Optional: normalize secondary too
      if (stakeholderPayload.phone.secondary) {
        let secondary = String(stakeholderPayload.phone.secondary).trim();
        if (secondary.startsWith("+91")) secondary = secondary.slice(3);
        else if (secondary.startsWith("91") && secondary.length > 10)
          secondary = secondary.slice(2);
        stakeholderPayload.phone.secondary = secondary;
      }
    }

    console.log("Creating stakeholder for account:", account_id);
    console.log("Normalized Payload:", stakeholderPayload);

    const stakeholder = await createStakeholder(account_id, stakeholderPayload);

    console.log("Stakeholder created:", stakeholder);

    return res.status(200).json({
      success: true,
      message: "Stakeholder created successfully",
      data: stakeholder,
    });
  } catch (error: any) {
    console.error("Error creating stakeholder:", error);

    const userMessage = parseRazorpayError(error);

    let statusCode = 500;
    if (error.statusCode) {
      statusCode = error.statusCode;
    } else if (userMessage.includes("already exists") || 
               userMessage.includes("duplicate")) {
      statusCode = 409; // Conflict
    } else if (userMessage.includes("Invalid") || 
               userMessage.includes("not found")) {
      statusCode = 400; // Bad Request
    }

    return res.status(statusCode).json({
      success: false,
      message: userMessage,
    });
  }
};

export const createProductConfiguration = async (req: Request, res: Response) => {
  try {
    const { product_name } = req.body;
    const { account_id } = req.params; 
    if (!account_id || !product_name) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid fields: account_id (URL), product_name, tnc_accepted are required",
      });
    }

    const payload: RequestProductConfiguration = {
      product_name
    };

    const result = await requestProductConfiguration(account_id, payload);

    return res.status(200).json({
      success: true,
      message: "Product configuration requested successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in createProductConfiguration:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while requesting product configuration",
    });
  }
};

export const updateRazorpayProduct = async (req: Request, res: Response) => {
  try {
    const { account_id, product_id } = req.params;
    if (!account_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "Both account_id and product_id are required in URL parameters.",
      });
    }

    const payload: UpdateProductConfiguration = req.body;

    // Validate settlement fields
    const { settlements, account_type } = payload;
    if (
      !settlements ||
      !settlements.account_number ||
      !settlements.ifsc_code ||
      !settlements.beneficiary_name
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Settlements object with account_number, ifsc_code, and beneficiary_name is required.",
      });
    }

    if (!account_type || !["SAVING", "CURRENT"].includes(account_type)) {
    return res.status(400).json({
    success: false,
    message: "Valid account_type is required. Allowed values: SAVING or CURRENT",
  });
}

    const razorpayPayload = { ...payload};
    delete razorpayPayload.account_type;

    // Call the utility function
    const response = await updateProductConfiguration
    (account_id, 
    product_id,
    razorpayPayload
  );

     await db
      .updateTable("sports_organizations")
      .set({ account_type,
        isFirstLogin: false,
      })   // SAVING / CURRENT
      .where("account_id", "=", account_id)
      .execute();

    return res.status(200).json({
      success: true,
      message: "Product configuration updated successfully.",
      data: {
        razorpay: response,
        saved_account_type: account_type,
      },
    });
  } catch (error: any) {
    console.error("Error updating product configuration:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to update product configuration",
    });
  }
};

