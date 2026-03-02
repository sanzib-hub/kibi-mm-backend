import Joi from "joi";
import {
  AgeFilterCondition,
  GenderFilter,
  WeightFilterCondition,
} from "../../database/kysely/types";

export const createEventSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(1500).required(),
  startDate: Joi.date().greater("now").required().messages({
    "date.greater": "Start date must be in the future",
  }),
  endDate: Joi.date().greater("now").required().messages({
    "date.greater": "End date must be in the future",
  }),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  organizerEmail: Joi.string().email().required(),
  mapLink: Joi.string().optional(),
  organizationId: Joi.number().required(),
  sportsCategoryId: Joi.array().items(Joi.number()).required(),
  brochure: Joi.string().uri().optional(),
  age_limit: Joi.number().integer().min(0).optional(),
  eventFee: Joi.number().required(),
  address: Joi.string().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  eventType: Joi.string()
    .valid("International", "National", "State", "League", "District")
    .required(),
  organizerPhoneNumber: Joi.string()
    .pattern(/^(\+91)?[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Organizer phone number must be a valid Indian mobile number",
    }),
  venue: Joi.string().required(),
  organizationName: Joi.string().required(),
  formId: Joi.number().required(),
  imageUrl: Joi.string().required(),
  teamSize: Joi.number().integer().min(1),
  type: Joi.string().valid("individual", "team").required(),
})
  .custom((value, helpers) => {
    if (value.endDate < value.startDate) {
      return helpers.message({
        custom: "End date must be greater than or equal to start date",
      });
    }
    return value;
  })
  .custom((value, helpers) => {
    const start = new Date(`1970-01-01 ${value.startTime}`);
    const end = new Date(`1970-01-01 ${value.endTime}`);

    if (end < start) {
      return helpers.message({
        custom: "End Time must be greater than or equal to start Time",
      });
    }
    return value;
  });

export const updateEventSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().max(1500).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  startTime: Joi.string().optional(),
  endTime: Joi.string().optional(),
  organizerEmail: Joi.string().email().optional(),
  sportsCategoryId: Joi.array().items(Joi.number()).optional(),
  brochure: Joi.string().uri().optional(),
  age_limit: Joi.number().integer().min(0).optional(),
  mapLink: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  participationFee: Joi.number().optional(),
  eventFee: Joi.number().optional(),
  address: Joi.string().optional(),
  eventType: Joi.string()
    .valid("International", "National", "State", "League", "District")
    .optional(),
  organizerPhoneNumber: Joi.string()
    .pattern(/^(\+91)?[6-9]\d{9}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Organizer phone number must be a valid Indian mobile number",
    }),
  venue: Joi.string().optional(),
  organizationName: Joi.string().optional(),
  imageUrl: Joi.string().optional(),
  isApprovedByAdmin: Joi.boolean().optional(),
  newFormId: Joi.number().optional(),
  oldFormId: Joi.number().optional(),
})
  .custom((value, helpers) => {
    if (value.endDate && value.startDate && value.endDate < value.startDate) {
      return helpers.message({
        custom: "End date must be greater than or equal to start date",
      });
    }
    return value;
  })
  .custom((value, helpers) => {
    if (value.endTime && value.startTime && value.endTime < value.startTime) {
      return helpers.message({
        custom: "End Time must be greater than or equal to start time.",
      });
    }
    return value;
  });

export const registerAffiliateSchema = Joi.object({
  event_id: Joi.number().required(),
  form_id: Joi.number().required(),
  response_data: Joi.object().required(),
  payment_id: Joi.string().required(),
  order_id: Joi.string().required(),
  amount_paid: Joi.number().required(),
  payment_status: Joi.string().required(),
  payment_time: Joi.string().required(),
});

// Keep the old schema for backward compatibility (deprecated)
export const registerAthleteSchema = registerAffiliateSchema;
