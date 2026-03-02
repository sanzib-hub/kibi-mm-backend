import axios from "axios";

export type Address = {
  street1: string;
  street2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type CreateRazorpayAccountInput = {
  email: string;
  phone: string;
  legal_business_name: string;
  business_type: string; // e.g., "partnership", "private_limited", etc.
  reference_id: string;
  contact_name: string;
  profile_category: string; // e.g., "healthcare"
  profile_subcategory: string; // e.g., "clinic"
  address: Address;
};

export async function createLinkedAccount(
  data: CreateRazorpayAccountInput
) {
  try {
    const key = process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_ID_KEY;
    const secret = process.env.RAZORPAY_API_SECRET || process.env.RAZORPAY_SECRET_KEY;

    if (!key || !secret) {
      throw new Error(
        "Missing Razorpay credentials (RAZORPAY_API_KEY/ID_KEY or RAZORPAY_API_SECRET/SECRET_KEY)"
      );
    }

    const payload = {
      email: data.email,
      phone: data.phone,
      type: "route",
      reference_id: data.reference_id,
      legal_business_name: data.legal_business_name,
      business_type: data.business_type,
      contact_name: data.contact_name,
      profile: {
        category: data.profile_category,
        subcategory: data.profile_subcategory,
        addresses: {
          registered: {
            street1: data.address.street1,
            street2: data.address.street2,
            city: data.address.city,
            state: data.address.state,
            postal_code: data.address.postal_code,
            country: data.address.country,
          },
        },
      },
    };

    const response = await axios.post("https://api.razorpay.com/v2/accounts", payload, {
      auth: {
        username: key,
        password: secret,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Error creating Razorpay account:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.error?.description || error.message,
    };
  }
}

export default createLinkedAccount;
