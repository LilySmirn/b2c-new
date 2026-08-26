# Vercel deployment checklist

The current `next build` completes successfully. If Vercel shows `Deployment failed with error` only after `Collecting build traces`, the failure is happening after the application build step, during Vercel packaging/deployment or project configuration.

## Project settings

Use these settings in Vercel:

- Framework Preset: `Next.js`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: leave empty / default (`.next` is handled by Vercel for Next.js)
- Root Directory: repository root (`/`)
- Node.js Version: use a runtime compatible with Next.js 15.5.18 and your local setup, for example Node.js `18.18.0` or newer. Do not force `20.x` if the project is developed on Node.js `18.18.0`.
> Note: `package-lock.json` is committed and should stay in sync with `package.json`. If dependencies are changed locally, regenerate it with `npm install` and commit the updated lockfile.


## Required environment variables

The application explicitly loads `.env` at startup and lets its values
override variables configured on the server. To deploy with exactly the same␊
database and authorization settings as the local application, include your␊
local `.env` file when uploading the project. The file remains ignored by Git
because it contains secrets. If `.env` is absent, Next.js keeps its standard
environment-loading behavior. The application does not explicitly load
`.env.local` anymore.

Add the same values for Production and Preview unless intentionally different:

- `AUTH_SECRET`
- `B2B_ADMIN_SECRET` — private high-entropy secret accepted only by the server-side B2B provisioning endpoint
- `EMAIL_CHANGE_SECRET` — permanent, private HMAC secret used only to sign email-change links
- `NEXTAUTH_URL` — production URL, for example `https://klinicheskie-rekomendatsii.ru`
- `NEXT_PUBLIC_APP_URL` — public production origin used in absolute email links (for example `https://klinrec.ru`)
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_ERROR_BOT_TOKEN`
- `TELEGRAM_ERROR_CHAT_ID`
- `EASYMED_API_USERNAME` if not using the built-in fallback
- `EASYMED_API_PASSWORD` if not using the built-in fallback

For the mail server, use the port/security pair required by the provider: usually
`SMTP_PORT=465` with `SMTP_SECURE=true`, or `SMTP_PORT=587` with
`SMTP_SECURE=false` (STARTTLS). The registration endpoint now returns an error
instead of reporting success when these variables are missing, authentication
fails, or the production host cannot connect to the SMTP server. An unverified
user can submit the registration form again to receive a fresh confirmation link.

Email-change links are resolved at request time. In local development they use
the current local origin; in production they use `APP_URL`, then `NEXTAUTH_URL`,
then the public `X-Forwarded-Host`/`X-Forwarded-Proto` supplied by the reverse
proxy. Do not use `NEXT_PUBLIC_APP_URL` for these links and do not set `APP_URL`
or `NEXTAUTH_URL` to `localhost` in production.

## If the build log is green but deployment still fails

1. In Vercel, open the failed deployment and check the lines after `Collecting build traces`; those lines belong to the deployment packaging step, not to `next build`.
2. Redeploy with `Redeploy > Clear Build Cache`.
3. Confirm the project is linked to the repository root and the Next.js framework preset is selected.
4. Check that the database host allows inbound connections from Vercel serverless functions, or use a managed database accessible from Vercel.
5. Keep non-runtime files out of the Vercel deployment using `.vercelignore`.