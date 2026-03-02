import Joi from "joi";

// Schema for form field validation
const formFieldSchema = Joi.object({
  id: Joi.string().required(),
  label: Joi.string().required(),
  type: Joi.string()
    .valid(
      "text",
      "number",
      "email",
      "tel",
      "textarea",
      "select",
      "checkbox",
      "radio",
      "date",
      "file"
    )
    .required(),
  required: Joi.boolean().required(),
  placeholder: Joi.string().optional(),
  min: Joi.number().optional(),
  max: Joi.number().optional(),
  options: Joi.array().items(Joi.string()).optional(),
  validation: Joi.object().optional(),
  group: Joi.string().optional(),
  order: Joi.number().required(),
  maxLength: Joi.number().optional(),
});

// Schema for form_values JSON structure
const formValuesSchema = Joi.object({
  fields: Joi.array().items(formFieldSchema).min(1).required(),
});

export const createFormSchema = Joi.object({
  formName: Joi.string().min(3).max(255).required(),
  header: Joi.string().min(10).max(1000).required(),
  organizationId: Joi.number().positive().optional(), // Made optional since it's extracted from JWT
  form_values: formValuesSchema.required(),
  type: Joi.string().valid("Team Sports", "Individual Play").required(),
  minPlayers: Joi.number().min(1).optional().allow(null),
  maxPlayers: Joi.number().min(1).optional().allow(null),
}).custom((value, helpers) => {
  // Validate minPlayers and maxPlayers relationship
  if (
    value.minPlayers &&
    value.maxPlayers &&
    value.minPlayers > value.maxPlayers
  ) {
    return helpers.message({
      custom: "minPlayers cannot be greater than maxPlayers",
    });
  }

  // For Team Sports, require minPlayers and maxPlayers
  if (value.type === "Team Sports") {
    if (!value.minPlayers || !value.maxPlayers) {
      return helpers.message({
        custom:
          "Team Sports forms must have both minPlayers and maxPlayers defined",
      });
    }
  }

  return value;
});

export const updateFormSchema = Joi.object({
  formName: Joi.string().min(3).max(255).optional(),
  header: Joi.string().min(10).max(1000).optional(),
  form_values: formValuesSchema.optional(),
  type: Joi.string().valid("Team Sports", "Individual Play").optional(),
  minPlayers: Joi.number().min(1).optional().allow(null),
  maxPlayers: Joi.number().min(1).optional().allow(null),
}).custom((value, helpers) => {
  // Validate minPlayers and maxPlayers relationship
  if (
    value.minPlayers &&
    value.maxPlayers &&
    value.minPlayers > value.maxPlayers
  ) {
    return helpers.message({
      custom: "minPlayers cannot be greater than maxPlayers",
    });
  }

  // For Team Sports, require minPlayers and maxPlayers
  if (value.type === "Team Sports") {
    if (value.minPlayers === undefined || value.maxPlayers === undefined) {
      return helpers.message({
        custom:
          "Team Sports forms must have both minPlayers and maxPlayers defined",
      });
    }
  }

  return value;
});

export const getFormsQuerySchema = Joi.object({
  organizationId: Joi.number().positive().optional(),
  type: Joi.string().valid("Team Sports", "Individual Play").optional(),
  formName: Joi.string().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
});
