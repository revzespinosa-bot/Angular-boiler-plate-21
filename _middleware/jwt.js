const { expressjwt: jwt } = require('express-jwt');
const db = require('../_helpers/db');

module.exports = authorize;

// lazy-init so JWT_SECRET is read after dotenv has loaded, not at require time
let _jwtMiddleware;
function jwtMiddleware() {
    if (!_jwtMiddleware) {
        _jwtMiddleware = jwt({ secret: process.env.JWT_SECRET, algorithms: ['HS256'] });
    }
    return _jwtMiddleware;
}

function authorize(roles = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // 1) authenticate JWT and attach req.auth
        (req, res, next) => jwtMiddleware()(req, res, next),

        // 2) attach the full account, then enforce role restrictions
        async (req, res, next) => {
            const account = await db.Account.findByPk(req.auth.id);
            if (!account) return res.status(401).json({ message: 'Unauthorized' });

            if (roles.length && !roles.includes(account.role)) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // attach refresh tokens for the current account so the controller can use them
            req.user = account.get();
            const refreshTokens = await account.getRefreshTokens();
            req.user.ownsToken = (token) => !!refreshTokens.find((x) => x.token === token);
            next();
        },
    ];
}
