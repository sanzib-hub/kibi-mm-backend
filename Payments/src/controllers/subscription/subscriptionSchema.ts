import Joi from "joi";

/**
 * Schema for creating a Razorpay Plan
 */
export const createPlanSchema = Joi.object({
  period: Joi.string()
    .valid("daily", "weekly", "monthly", "yearly")
    .required()
    .label("Period")
    .messages({
      "any.only": "Period must be one of: daily, weekly, monthly, yearly",
      "any.required": "Period is required",
    }),

  interval: Joi.number()
    .integer()
    .min(1)
    .required()
    .label("Interval")
    .messages({
      "number.base": "Interval must be a number",
      "number.integer": "Interval must be an integer",
      "number.min": "Interval must be at least 1",
      "any.required": "Interval is required",
    }),

  item: Joi.object({
    name: Joi.string()
      .required()
      .label("Item Name")
      .messages({
        "string.empty": "Item name cannot be empty",
        "any.required": "Item name is required",
      }),

    amount: Joi.number()
      .min(0.01)
      .required()
      .label("Amount")
      .messages({
        "number.base": "Amount must be a number (in rupees)",
        "number.min": "Amount must be at least ₹0.01",
        "any.required": "Amount is required",
      }),

    currency: Joi.string()
      .length(3)
      .uppercase()
      .required()
      .label("Currency")
      .messages({
        "string.length": "Currency must be a 3-letter code (e.g., INR, USD)",
        "any.required": "Currency is required",
      }),

    description: Joi.string()
      .optional()
      .allow("")
      .label("Description"),
  })
    .required()
    .label("Item")
    .messages({
      "any.required": "Item object is required",
    }),

  notes: Joi.object()
    .optional()
    .label("Notes")
    .messages({
      "object.base": "Notes must be an object",
    }),
});


