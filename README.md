# Angular 21 Auth Boilerplate — Backend (Node.js + MySQL)

Backend API for the Angular 21 Auth Boilerplate frontend. Implements email
sign-up + verification, JWT authentication with refresh tokens (rotated),
role-based authorization (User / Admin), and forgot/reset password.

## Live deployment

- **API base URL:** `https://angular21-auth-boilerplate-backend.onrender.com`
- **Swagger docs:** `https://angular21-auth-boilerplate-backend.onrender.com/api-docs`
- **Frontend:** `https://angular21-auth-boilerplate-frontend.onrender.com`
- **Frontend repo:** https://github.com/dydave6464/angular21-auth-boilerplate-frontend

## Endpoints

All routes are prefixed with `/accounts`. Full schemas in
[`swagger.yaml`](./swagger.yaml) and the live `/api-docs` page.

| Method | Path                            | Auth     | Purpose                              |
| ------ | ------------------------------- | -------- | ------------------------------------ |
| POST   | `/accounts/authenticate`        | public   | Login → JWT + refresh-token cookie   |
| POST   | `/accounts/refresh-token`       | cookie   | Rotate the refresh token             |
| POST   | `/accounts/revoke-token`        | bearer   | Revoke a refresh token (logout)      |
| POST   | `/accounts/register`            | public   | Sign up + send verification email    |
| POST   | `/accounts/verify-email`        | public   | Verify email with token              |
| POST   | `/accounts/forgot-password`     | public   | Send reset-password email            |
| POST   | `/accounts/validate-reset-token`| public   | Check that a reset token is valid    |
| POST   | `/accounts/reset-password`      | public   | Set a new password                   |
| GET    | `/accounts`                     | Admin    | List all accounts                    |
| GET    | `/accounts/:id`                 | bearer   | Get one account (own or any if Admin)|
| POST   | `/accounts`                     | Admin    | Create an account                    |
| PUT    | `/accounts/:id`                 | bearer   | Update (own or any if Admin)         |
| DELETE | `/accounts/:id`                 | bearer   | Delete (own or any if Admin)         |

## Tech stack

- Node.js, Express
- Sequelize (MySQL dialect) — works with TiDB Cloud, Aiven, Railway, etc.
- bcryptjs (password hashing)
- jsonwebtoken + express-jwt (access tokens)
- Brevo SDK (`sib-api-v3-sdk`) for verification + reset emails over HTTPS
- Joi (request validation)
- swagger-ui-express + yamljs (`/api-docs`)

## Local setup

```bash
git clone https://github.com/dydave6464/angular21-auth-boilerplate-backend.git
cd angular21-auth-boilerplate-backend
npm install
# create a .env file at the repo root with the variables listed below
npm run dev              # nodemon, restarts on changes
# or:
npm start
```

The server listens on `PORT` (default `4000`).

## Environment variables

Set these in `.env` for local dev, or as environment variables on Render in
production. Never commit real secrets.

| Key             | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `PORT`          | Port to listen on. Render injects this automatically.                        |
| `NODE_ENV`      | `development` or `production`.                                               |
| `DB_HOST`       | MySQL host (e.g. TiDB Cloud `gateway01.*.tidbcloud.com`).                    |
| `DB_PORT`       | `4000` for TiDB Cloud, `3306` for most other hosts.                          |
| `DB_NAME`       | Database name.                                                               |
| `DB_USER`       | DB username (TiDB uses `<prefix>.root`).                                     |
| `DB_PASSWORD`   | DB password.                                                                 |
| `DB_SSL`        | `true` for managed providers that require TLS (TiDB, Aiven, etc.).           |
| `JWT_SECRET`    | Random string ≥32 chars. Generate: `openssl rand -hex 32`.                   |
| `CORS_ORIGIN`   | Exact frontend URL — no trailing slash, no `*` (credentials require this).   |
| `COOKIE_SECURE` | `true` in production over HTTPS.                                             |
| `COOKIE_SAMESITE` | `none` for cross-site (Render frontend ↔ Render backend); `lax` locally.   |
| `BREVO_API_KEY` | Brevo / Sendinblue API key for sending verification + reset emails over HTTPS. |
| `EMAIL_FROM`    | "From" address on outbound emails.                                           |
| `EMAIL_FROM_NAME` | Optional sender display name for outbound emails.                           |
| `FRONTEND_URL`  | Base URL used to build verification + reset links in emails.                 |

## Deploying to Render

1. Push this repo to GitHub.
2. Render → **New +** → **Web Service** → connect the repo.
3. **Build Command:** `npm install`. **Start Command:** `npm start`.
4. Add every variable above under the service's **Environment** tab.
5. After first deploy, hit `/api-docs` to confirm the API is up.
6. From Swagger, register a new account; check that:
   - A row appears in the `accounts` table.
   - The verification email arrives in your SMTP inbox (or appears in the
     server logs as a preview URL when using Ethereal).
   - Clicking the link verifies the account and login then succeeds.

## Notes

- The first registered account is automatically assigned the `Admin` role;
  all subsequent accounts default to `User`.
- Refresh tokens are rotated on every `/refresh-token` call and stored in the
  `refreshTokens` table. The browser only ever sees them as an HttpOnly cookie.
- Free-tier Render web services cold-start after ~15 minutes of inactivity;
  the first request after idle can take 30–60 seconds. Subsequent requests
  are normal speed.
