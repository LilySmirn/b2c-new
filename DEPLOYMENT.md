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

Add the same values for Production and Preview unless intentionally different:

- `AUTH_SECRET`
- `NEXTAUTH_URL` — production URL, for example `https://klinicheskie-rekomendatsii.ru`
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

## If the build log is green but deployment still fails

1. In Vercel, open the failed deployment and check the lines after `Collecting build traces`; those lines belong to the deployment packaging step, not to `next build`.
2. Redeploy with `Redeploy > Clear Build Cache`.
3. Confirm the project is linked to the repository root and the Next.js framework preset is selected.
4. Check that the database host allows inbound connections from Vercel serverless functions, or use a managed database accessible from Vercel.
5. Keep non-runtime files out of the Vercel deployment using `.vercelignore`.