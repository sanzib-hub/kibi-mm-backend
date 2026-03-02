import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
});

// ==================== Campaign Schemas ====================

export const createCampaignSchema = Joi.object({
  brandId: Joi.number().required(),
  description: Joi.string().max(2000).required().messages({
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Description is required",
  }),
  name: Joi.string().max(100).required().messages({
    "string.max": "Campaign name cannot exceed 100 characters",
    "any.required": "Campaign name is required",
  }),
  product: Joi.string().max(255).required().messages({
    "string.max": "Product name cannot exceed 255 characters",
    "any.required": "Product is required",
  }),
  sportsCategoryId: Joi.array()
    .items(Joi.number().integer())
    .required()
    .messages({
      "any.required": "Sports category Id Array is required",
    }),
  ageRange: Joi.string().max(50).required().messages({
    "string.max": "Age range cannot exceed 50 characters",
    "any.required": "Age range is required",
  }),
  gender: Joi.string().valid("MALE", "FEMALE", "ANY").required().messages({
    "any.only": "Gender must be one of: MALE, FEMALE, ANY",
    "any.required": "Gender is required",
  }),
  geography: Joi.string().max(400).required().messages({
    "string.max": "Geography cannot exceed 400 characters",
    "any.required": "Geography is required",
  }),
  followersRange: Joi.string().max(50).required().messages({
    "string.max": "Followers range cannot exceed 50 characters",
    "any.required": "Followers range is required",
  }),
  dealType: Joi.string()
    .valid(
      "brandAmbassador",
      "monetary",
      "barter",
      "monetaryAndBarter",
      "affiliateCommissionBased",
      "eventAppearance",
      "socialMediaTakeover",
      "productPlacement",
      "csrPartnership"
    )
    .required()
    .messages({
      "any.only":
        "Deal type must be one of: brandAmbassador, monetary, barter, monetaryAndBarter, affiliateCommissionBased, eventAppearance, socialMediaTakeover, productPlacement, csrPartnership",
      "any.required": "Deal type is required",
    }),
  deliverables: Joi.string().max(2000).required().messages({
    "string.max": "Deliverables cannot exceed 2000 characters",
    "any.required": "Deliverables are required",
  }),
  budget: Joi.string().max(100).required().messages({
    "string.max": "Budget cannot exceed 100 characters",
    "any.required": "Budget is required",
  }),
  active: Joi.boolean().optional().default(true),
});

export const updateCampaignSchema = Joi.object({
  description: Joi.string().max(2000).optional().messages({
    "string.max": "Description cannot exceed 2000 characters",
  }),
  name: Joi.string().max(100).optional().messages({
    "string.max": "Campaign name cannot exceed 100 characters",
  }),
  brandId: Joi.number().optional(),
  product: Joi.string().max(255).optional().messages({
    "string.max": "Product name cannot exceed 255 characters",
  }),
  sportsCategoryId: Joi.array()
    .items(Joi.number().integer())
    .optional(),
  ageRange: Joi.string().max(50).optional().messages({
    "string.max": "Age range cannot exceed 50 characters",
  }),
  gender: Joi.string().valid("MALE", "FEMALE", "ANY").optional().messages({
    "any.only": "Gender must be one of: MALE, FEMALE, ANY",
  }),
  geography: Joi.string().max(255).optional().messages({
    "string.max": "Geography cannot exceed 255 characters",
  }),
  followersRange: Joi.string().max(50).optional().messages({
    "string.max": "Followers range cannot exceed 50 characters",
  }),
  dealType: Joi.string()
    .valid(
      "brandAmbassador",
      "monetary",
      "barter",
      "monetaryAndBarter",
      "affiliateCommissionBased",
      "eventAppearance",
      "socialMediaTakeover",
      "productPlacement",
      "csrPartnership"
    )
    .optional()
    .messages({
      "any.only":
        "Deal type must be one of: brandAmbassador, monetary,barter,monetaryAndBarter,affiliateCommissionBased,eventAppearance,socialMediaTakeover,productPlacement,csrPartnership",
    }),
  deliverables: Joi.string().max(2000).optional().messages({
    "string.max": "Deliverables cannot exceed 2000 characters",
  }),
  budget: Joi.string().max(100).optional().messages({
    "string.max": "Budget cannot exceed 100 characters",
  }),
  active: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

export const campaignQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
  sportsCategoryId: Joi.optional(),
  gender: Joi.string().valid("MALE", "FEMALE", "ANY").optional(),
  dealType: Joi.string()
    .valid(
      "brandAmbassador",
      "monetary",
      "barter",
      "monetaryAndBarter",
      "affiliateCommissionBased",
      "eventAppearance",
      "socialMediaTakeover",
      "productPlacement",
      "csrPartnership"
    )
    .optional()
    .messages({
      "any.only":
        "Deal type must be one of: brandAmbassador, monetary,barter,monetaryAndBarter,affiliateCommissionBased,eventAppearance,socialMediaTakeover,productPlacement,csrPartnership",
    }),
  active: Joi.boolean().optional(),
  geography: Joi.string().max(255).optional(),
  followersRange: Joi.string().max(50).optional(),
  ageRange: Joi.string().max(50).optional(),
});

// ==================== Affiliate Schemas ====================

export const affiliateQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),
  status: Joi.string()
    .valid("PENDING", "VERIFIED", "BANNED", "FLAGGED")
    .optional()
    .messages({
      "any.only": "Status must be one of: PENDING, VERIFIED, BANNED, FLAGGED",
    }),
  role: Joi.string()
    .valid(
      "ATHLETE",
      "COACH",
      "SPORTS STAFF",
      "NUTRITIONIST",
      "PHYSIOTHERAPIST",
      "PSYCHOLOGIST",
      "SPORTS JOURNALIST",
      "SPORTS MANAGEMENT PROFESSIONAL"
    )
    .optional()
    .messages({
      "any.only":
        "Role must be one of: ATHLETE, COACH, SPORTS STAFF, NUTRITIONIST, PHYSIOTHERAPIST, PSYCHOLOGIST, SPORTS JOURNALIST, SPORTS MANAGEMENT PROFESSIONAL",
    }),
  sportsCategoryId: Joi.number().integer().optional().messages({
    "number.base": "Sports category ID must be a number",
    "number.integer": "Sports category ID must be an integer",
  }),
  gender: Joi.string().valid("MALE", "FEMALE", "OTHER").optional().messages({
    "any.only": "Gender must be one of: MALE, FEMALE, OTHER",
  }),
  search: Joi.string().max(255).optional().messages({
    "string.max": "Search term cannot exceed 255 characters",
  }),
});

// ==================== Brand Schemas ====================

export const createBrandSchema = Joi.object({
  name: Joi.string().max(255).required().messages({
    "string.max": "Brand name cannot exceed 255 characters",
    "any.required": "Brand name is required",
  }),
  logo: Joi.string().required().messages({
    "any.required": "Logo is required",
  }),
});

export const updateBrandSchema = Joi.object({
  name: Joi.string().max(255).optional().messages({
    "string.max": "Brand name cannot exceed 255 characters",
  }),
  logo: Joi.string().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

