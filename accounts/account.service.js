const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');

const db = require('../_helpers/db');
const sendEmail = require('../_helpers/send-email');
const Role = require('../_helpers/role');

module.exports = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete,
};

// --- auth ---

async function authenticate({ email, password, ipAddress }) {
    const account = await db.Account.scope('withHash').findOne({ where: { email } });

    if (!account || !account.isVerified || !(await bcrypt.compare(password, account.passwordHash))) {
        throw 'Email or password is incorrect';
    }

    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);
    await refreshToken.save();

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token,
    };
}

async function refreshToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    const account = await refreshToken.getAccount();

    // rotate token
    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    await newRefreshToken.save();

    return {
        ...basicDetails(account),
        jwtToken: generateJwtToken(account),
        refreshToken: newRefreshToken.token,
    };
}

async function revokeToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

// --- registration / verification ---

async function register(params, origin) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        // never reveal that the email is already taken — fire-and-forget the
        // "you already have an account" email so the response isn't blocked by SMTP
        sendAlreadyRegisteredEmail(params.email, origin).catch((err) =>
            console.error('Failed to send already-registered email:', err)
        );
        return;
    }

    const account = new db.Account(params);

    // first-registered account is Admin, all others are User
    const isFirstAccount = (await db.Account.count()) === 0;
    account.role = isFirstAccount ? Role.Admin : Role.User;
    account.verificationToken = randomTokenString();
    account.passwordHash = await hash(params.password);

    await account.save();

    // fire-and-forget verification email so a slow/blocked SMTP doesn't hang the request
    sendVerificationEmail(account, origin).catch((err) =>
        console.error('Failed to send verification email:', err)
    );
}

async function verifyEmail({ token }) {
    const account = await db.Account.findOne({ where: { verificationToken: token } });
    if (!account) throw 'Verification failed';

    account.verified = Date.now();
    account.verificationToken = null;
    await account.save();
}

async function forgotPassword({ email }, origin) {
    const account = await db.Account.findOne({ where: { email } });
    // always return ok response to prevent email enumeration
    if (!account) return;

    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();

    // fire-and-forget so a slow/blocked SMTP doesn't hang the request
    sendPasswordResetEmail(account, origin).catch((err) =>
        console.error('Failed to send password reset email:', err)
    );
}

async function validateResetToken({ token }) {
    const account = await db.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [Op.gt]: Date.now() },
        },
    });
    if (!account) throw 'Invalid token';
}

async function resetPassword({ token, password }) {
    const account = await db.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [Op.gt]: Date.now() },
        },
    });
    if (!account) throw 'Invalid token';

    account.passwordHash = await hash(password);
    account.passwordReset = Date.now();
    account.resetToken = null;
    await account.save();
}

// --- account CRUD (admin) ---

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map((x) => basicDetails(x));
}

async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        throw `Email "${params.email}" is already registered`;
    }
    const account = new db.Account(params);
    account.verified = Date.now();
    account.passwordHash = await hash(params.password);
    await account.save();
    return basicDetails(account);
}

async function update(id, params) {
    const account = await getAccount(id);

    // validate (if email was changed)
    if (params.email && account.email !== params.email && (await db.Account.findOne({ where: { email: params.email } }))) {
        throw `Email "${params.email}" is already registered`;
    }

    // hash password if it was entered
    if (params.password) {
        params.passwordHash = await hash(params.password);
    }

    // copy params to account and save
    Object.assign(account, params);
    account.updated = Date.now();
    await account.save();

    return basicDetails(account);
}

async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}

// --- helpers ---

async function getAccount(id) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getRefreshToken(token) {
    if (!token) throw 'Invalid token';
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive()) throw 'Invalid token';
    return refreshToken;
}

async function hash(password) {
    return bcrypt.hash(password, 10);
}

function generateJwtToken(account) {
    // 15 minute access token
    return jwt.sign({ sub: account.id, id: account.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(account, ipAddress) {
    return new db.RefreshToken({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByIp: ipAddress,
    });
}

function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}

// --- emails ---

function frontendUrl(origin) {
    // prefer the configured FRONTEND_URL, fall back to the request origin
    return process.env.FRONTEND_URL || origin;
}

async function sendVerificationEmail(account, origin) {
    const verifyUrl = `${frontendUrl(origin)}/account/verify-email?token=${account.verificationToken}`;
    const html = `
        <h4>Verify Email</h4>
        <p>Thanks for registering! Please click the link below to verify your email address:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    await sendEmail({ to: account.email, subject: 'Sign-up Verification API - Verify Email', html });
}

async function sendAlreadyRegisteredEmail(email, origin) {
    const html = `
        <h4>Email Already Registered</h4>
        <p>Your email <strong>${email}</strong> is already registered.</p>
        <p>If you don't remember your password, please visit the
           <a href="${frontendUrl(origin)}/account/forgot-password">forgot password</a> page.</p>`;
    await sendEmail({ to: email, subject: 'Sign-up Verification API - Email Already Registered', html });
}

async function sendPasswordResetEmail(account, origin) {
    const resetUrl = `${frontendUrl(origin)}/account/reset-password?token=${account.resetToken}`;
    const html = `
        <h4>Reset Password Email</h4>
        <p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    await sendEmail({ to: account.email, subject: 'Sign-up Verification API - Reset Password', html });
}
