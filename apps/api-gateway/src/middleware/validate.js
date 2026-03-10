/**
 * Input Validation Middleware
 * Validates and sanitizes request inputs for all API endpoints.
 * Uses a schema-based approach without external dependencies.
 */

// ─── Primitive validators ──────────────────────────────────────────────────────
const validators = {
  string: (v, { min = 0, max = 10000, pattern } = {}) => {
    if (typeof v !== "string") return "Must be a string";
    const t = v.trim();
    if (t.length < min) return `Must be at least ${min} characters`;
    if (t.length > max) return `Must not exceed ${max} characters`;
    if (pattern && !pattern.test(t)) return "Invalid format";
    return null;
  },
  email: (v) => {
    if (typeof v !== "string") return "Must be a string";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))
      return "Invalid email address";
    return null;
  },
  phone: (v) => {
    if (typeof v !== "string" && typeof v !== "number")
      return "Must be a string";
    const digits = String(v).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15)
      return "Must be 10–15 digits with country code";
    return null;
  },
  password: (v) => {
    if (typeof v !== "string") return "Must be a string";
    if (v.length < 8) return "Must be at least 8 characters";
    if (v.length > 128) return "Must not exceed 128 characters";
    return null;
  },
  uuid: (v) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    )
      return "Invalid UUID";
    return null;
  },
  number: (v, { min, max } = {}) => {
    const n = Number(v);
    if (isNaN(n)) return "Must be a number";
    if (min !== undefined && n < min) return `Must be at least ${min}`;
    if (max !== undefined && n > max) return `Must not exceed ${max}`;
    return null;
  },
  boolean: (v) => {
    if (typeof v !== "boolean") return "Must be true or false";
    return null;
  },
  enum: (v, { values } = {}) => {
    if (!values?.includes(v)) return `Must be one of: ${values?.join(", ")}`;
    return null;
  },
};

// ─── Schema runner ─────────────────────────────────────────────────────────────
function runSchema(body, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    // Required check
    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors[field] = `${field} is required`;
      continue;
    }
    // Skip optional empty fields
    if (
      !rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      continue;
    }
    // Type check
    const typeValidator = validators[rules.type];
    if (!typeValidator) continue;
    const err = typeValidator(value, rules);
    if (err) errors[field] = err;
  }
  return errors;
}

// ─── Middleware factory ────────────────────────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const errors = runSchema(req.body, schema);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        fields: errors,
      });
    }
    next();
  };
}

// ─── Pre-built schemas ─────────────────────────────────────────────────────────
const schemas = {
  register: {
    name: { type: "string", required: true, min: 2, max: 100 },
    email: { type: "email", required: true },
    password: { type: "password", required: true },
  },
  login: {
    email: { type: "email", required: true },
    password: { type: "string", required: true, min: 1, max: 128 },
  },
  sendMessage: {
    phone: { type: "phone", required: true },
    message: { type: "string", required: true, min: 1, max: 4096 },
    type: {
      type: "enum",
      required: false,
      values: ["text", "image", "document", "video", "template"],
    },
  },
  createTemplate: {
    name: { type: "string", required: true, min: 2, max: 100 },
    category: {
      type: "enum",
      required: true,
      values: ["MARKETING", "UTILITY", "AUTHENTICATION"],
    },
    language: { type: "string", required: true, min: 2, max: 10 },
    body: { type: "string", required: true, min: 5, max: 1024 },
  },
  createCampaign: {
    name: { type: "string", required: true, min: 2, max: 200 },
    template_id: { type: "string", required: true },
  },
  createContact: {
    phone: { type: "phone", required: true },
    name: { type: "string", required: false, min: 2, max: 100 },
    email: { type: "email", required: false },
  },
  updateWorkspace: {
    name: { type: "string", required: false, min: 2, max: 100 },
    waba_access_token: { type: "string", required: false, max: 500 },
    waba_phone_number_id: { type: "string", required: false, max: 100 },
    waba_business_account_id: { type: "string", required: false, max: 100 },
  },
  createAutomation: {
    name: { type: "string", required: true, min: 2, max: 200 },
    trigger_type: { type: "string", required: true, max: 100 },
  },
};

module.exports = { validate, schemas, validators, runSchema };
