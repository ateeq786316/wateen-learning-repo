const Joi = require('joi');

const passwordSchema = Joi.string().min(8).max(72);

const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().required(),
  password: passwordSchema.required(),
  age: Joi.number().integer().min(0).max(150).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  password: passwordSchema.required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  age: Joi.number().integer().min(0).max(150).optional(),
}).min(1);

function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    const messages = error.details.map((d) => d.message);
    const err = new Error(messages.join('; '));
    err.statusCode = 400;
    throw err;
  }
  return value;
}

module.exports = {
  validateRegister: (data) => validate(registerSchema, data),
  validateLogin: (data) => validate(loginSchema, data),
  validateRefresh: (data) => validate(refreshSchema, data),
  validateForgotPassword: (data) => validate(forgotPasswordSchema, data),
  validateResetPassword: (data) => validate(resetPasswordSchema, data),
  validateUpdateProfile: (data) => validate(updateProfileSchema, data),
};
