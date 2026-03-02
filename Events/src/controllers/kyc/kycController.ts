import express from "express";
import axios from "axios";

const DIGIO_PAN_URL = "https://ext.digio.in:444/v3/client/kyc/fetch_id_data/PAN";
const DIGIO_GST_URL = "https://ext.digio.in:444/v3/client/kyc/fetch_id_data/GST";

export const validatePAN = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { pan } = req.body;

  if (!pan) {
    res.status(400).json({
      success: false,
      message: "PAN is required",
    });
    return;
  }

  const digioUsername = process.env.DIGIO_CLIENT_USERNAME;
  const digioPassword = process.env.DIGIO_CLIENT_PASSWORD;

  if (!digioUsername || !digioPassword) {
    res.status(500).json({
      success: false,
      error: "Digio API credentials are not configured",
      message: "DIGIO_CLIENT_USERNAME and DIGIO_CLIENT_PASSWORD environment variables are required",
    });
    return;
  }

  try {
    const response = await axios.post(
      DIGIO_PAN_URL,
      {
        id_no: pan.toUpperCase(),
        unique_request_id: `pan-${Date.now()}`,
      },
      {
        auth: {
          username: digioUsername,
          password: digioPassword,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error: any) {
    console.error("PAN validation error:", error);
    // Handle axios errors properly
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const statusCode = error.response.status || 500;
      res.status(statusCode).json({
        success: false,
        error: "PAN validation failed",
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(500).json({
        success: false,
        error: "No response from Digio API"
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }
};

export const validateGST = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  const { gst } = req.body;

  // GST OPTIONAL
  if (!gst) {
    res.status(200).json({
      success: true,
      message: "GST not provided, skipping validation",
      data: null,
    });
    return;
  }

  const digioUsername = process.env.DIGIO_CLIENT_USERNAME;
  const digioPassword = process.env.DIGIO_CLIENT_PASSWORD;

  if (!digioUsername || !digioPassword) {
    res.status(500).json({
      success: false,
      error: "Digio API credentials are not configured",
      message: "DIGIO_CLIENT_USERNAME and DIGIO_CLIENT_PASSWORD environment variables are required",
    });
    return;
  }

  try {
    const response = await axios.post(
      DIGIO_GST_URL,
      {
        id_no: gst.toUpperCase(),
        unique_request_id: `gst-${Date.now()}`,
      },
      {
        auth: {
          username: digioUsername,
          password: digioPassword,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error: any) {
    console.error("GST validation error:", error);
    // Handle axios errors properly
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const statusCode = error.response.status || 500;
      res.status(statusCode).json({
        success: false,
        error: "GST validation failed",
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(500).json({
        success: false,
        error: "No response from Digio API"
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }
};
