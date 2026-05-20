const express = require('express');
const router = express.Router();

const authorize = require('../_middleware/jwt');
const validateRequest = require('../_middleware/validate-request');
const Role = require('../_helpers/role');
const accountService = require('./account.service');
const schemas = require('./account.schemas');

// public routes
router.post('/authenticate', validate(schemas.authenticateSchema), authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeToken);
router.post('/register', validate(schemas.registerSchema), register);
router.post('/verify-email', validate(schemas.verifyEmailSchema), verifyEmail);
router.post('/forgot-password', validate(schemas.forgotPasswordSchema), forgotPassword);
router.post('/validate-reset-token', validate(schemas.validateResetTokenSchema), validateResetToken);
router.post('/reset-password', validate(schemas.resetPasswordSchema), resetPassword);

// authorized routes
router.get('/', authorize(Role.Admin), getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize(Role.Admin), validate(schemas.createSchema), create);
router.put('/:id', authorize(), validate(schemas.updateSchema), update);
router.delete('/:id', authorize(), _delete);

module.exports = router;

// --- helpers ---

function validate(schema) {
    return (req, res, next) => validateRequest(req, next, schema);
}

function setRefreshTokenCookie(res, token) {
    const cookieOptions = {
        httpOnly: true,
        secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
        sameSite: process.env.COOKIE_SAMESITE || 'lax',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    res.cookie('refreshToken', token, cookieOptions);
}

// --- route handlers ---

function authenticate(req, res, next) {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    accountService
        .authenticate({ email, password, ipAddress })
        .then(({ refreshToken, ...account }) => {
            setRefreshTokenCookie(res, refreshToken);
            res.json(account);
        })
        .catch(next);
}

function refreshToken(req, res, next) {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const ipAddress = req.ip;
    accountService
        .refreshToken({ token, ipAddress })
        .then(({ refreshToken, ...account }) => {
            setRefreshTokenCookie(res, refreshToken);
            res.json(account);
        })
        .catch(next);
}

function revokeToken(req, res, next) {
    // accept token from request body or cookie
    const token = req.body.token || req.cookies.refreshToken;
    const ipAddress = req.ip;

    if (!token) return res.status(400).json({ message: 'Token is required' });

    // users can revoke their own tokens; admins can revoke any
    if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService
        .revokeToken({ token, ipAddress })
        .then(() => res.json({ message: 'Token revoked' }))
        .catch(next);
}

function register(req, res, next) {
    accountService
        .register(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Registration successful, please check your email for verification instructions' }))
        .catch(next);
}

function verifyEmail(req, res, next) {
    accountService
        .verifyEmail(req.body)
        .then(() => res.json({ message: 'Verification successful, you can now login' }))
        .catch(next);
}

function forgotPassword(req, res, next) {
    accountService
        .forgotPassword(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
        .catch(next);
}

function validateResetToken(req, res, next) {
    accountService
        .validateResetToken(req.body)
        .then(() => res.json({ message: 'Token is valid' }))
        .catch(next);
}

function resetPassword(req, res, next) {
    accountService
        .resetPassword(req.body)
        .then(() => res.json({ message: 'Password reset successful, you can now login' }))
        .catch(next);
}

function getAll(req, res, next) {
    accountService.getAll().then((accounts) => res.json(accounts)).catch(next);
}

function getById(req, res, next) {
    // users can get their own account, admins can get any account
    if (req.params.id !== String(req.user.id) && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    accountService.getById(req.params.id).then((account) => res.json(account)).catch(next);
}

function create(req, res, next) {
    accountService.create(req.body).then((account) => res.json(account)).catch(next);
}

function update(req, res, next) {
    if (req.params.id !== String(req.user.id) && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    accountService.update(req.params.id, req.body).then((account) => res.json(account)).catch(next);
}

function _delete(req, res, next) {
    if (req.params.id !== String(req.user.id) && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    accountService.delete(req.params.id).then(() => res.json({ message: 'Account deleted successfully' })).catch(next);
}
