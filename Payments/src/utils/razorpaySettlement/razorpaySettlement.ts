import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const RAZORPAY_ID_KEY = process.env.RAZORPAY_ID_KEY!;
const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY!;

export interface CreateStakeholder
 {
  name: string;
  email: string;
  percentage_ownership?: number;
  relationship?: {
    director?: boolean;
    executive?: boolean;
  };
  phone?: {
    primary?: string;
    secondary?: string;
  };
  addresses?: {
    residential?: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  kyc?: {
    pan: string;
  };
  notes?: Record<string, string>;
}

export const createStakeholder = async (
  account_id: string,
  payload: CreateStakeholder
) => {
  try {
    const response = await axios.post(
      `https://api.razorpay.com/v2/accounts/${account_id}/stakeholders`,
      payload,
      {
        auth: {
          username: RAZORPAY_ID_KEY,
          password: RAZORPAY_SECRET_KEY,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Razorpay response error data:", error.response.data);
      console.error("Razorpay response status:", error.response.status);
      console.error("Razorpay response headers:", error.response.headers);
    } else {
      console.error("Razorpay error message:", error.message);
    }
    throw error;
  }
};

export interface RequestProductConfiguration {
  product_name: string; 
}

export const requestProductConfiguration = async (
  account_id: string,
  payload: RequestProductConfiguration
) => {
  try {
    // Ensure tnc true is sent for self-validation
    const finalPayload = {
      ...payload
    };

    const response = await axios.post(
      `https://api.razorpay.com/v2/accounts/${account_id}/products`,
      finalPayload,
      {
        auth: {
          username: RAZORPAY_ID_KEY,
          password: RAZORPAY_SECRET_KEY,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Razorpay response error data:", error.response.data);
      console.error("Razorpay response status:", error.response.status);
      console.error("Razorpay response headers:", error.response.headers);
    } else {
      console.error("Razorpay error message:", error.message);
    }
    throw error;
  }
};

export interface UpdateProductConfiguration {
  settlements: {
    account_number: string;
    ifsc_code: string;
    beneficiary_name: string;
  };

  account_type?: "SAVING" | "CURRENT";
}

export const updateProductConfiguration = async (
  account_id: string,
  product_id: string,
  payload: UpdateProductConfiguration
) => {
  try {
    const response = await axios.patch(
      `https://api.razorpay.com/v2/accounts/${account_id}/products/${product_id}`,
      payload,
      {
        auth: {
          username: RAZORPAY_ID_KEY,
          password: RAZORPAY_SECRET_KEY,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Razorpay response error data:", error.response.data);
      console.error("Razorpay response status:", error.response.status);
      console.error("Razorpay response headers:", error.response.headers);
    } else {
      console.error("Razorpay error message:", error.message);
    }
    throw error;
  }
};
