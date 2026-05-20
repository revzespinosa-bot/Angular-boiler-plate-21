const Joi = require('joi');
const Role = require('../_helpers/role');

module.exports = {
    authenticateSchema: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),

    registerSchema: Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        acceptTerms: Joi.boolean().valid(true).required(),
    }),

    verifyEmailSchema: Joi.object({
        token: Joi.string().required(),
    }),

    forgotPasswordSchema: Joi.object({
        email: Joi.string().email().required(),
    }),

    validateResetTokenSchema: Joi.object({
        token: Joi.string().required(),
    }),

    resetPasswordSchema: Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    }),

    createSchema: Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        role: Joi.string().valid(Role.Admin, Role.User).required(),
    }),

    updateSchema: Joi.object({
        title: Joi.string().empty(''),
        firstName: Joi.string().empty(''),
        lastName: Joi.string().empty(''),
        email: Joi.string().email().empty(''),
        password: Joi.string().min(6).empty(''),
        confirmPassword: Joi.string().valid(Joi.ref('password')).empty(''),
        role: Joi.string().valid(Role.Admin, Role.User).empty(''),
    }).with('password', 'confirmPassword'),
};
