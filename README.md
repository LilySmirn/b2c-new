- `AUTH_SECRET`
- `B2B_ADMIN_SECRET` — private high-entropy secret accepted only by the server-side B2B provisioning endpoint
- `PAYMENT_INTERNAL_SECRET` — high-entropy secret shared only with the separate webhook service
- `YOOKASSA_SHOP_ID` — shop ID of the YooKassa test store (server-side)
- `YOOKASSA_SECRET_KEY` — secret key of the YooKassa test store (server-side; never use a `NEXT_PUBLIC_` prefix)
- `YOOKASSA_WEBHOOK_SERVICE_URL` — origin of the separately deployed webhook service (locally `http://localhost:3001`)
- `WEBHOOK_HEALTH_SECRET` — bearer secret used only for the webhook service `/health` check
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
- `TELEGRAM_ERROR_CHAT_ID`
- `TELEGRAM_PAYMENT_BOT_TOKEN` — token for `@easymed_notifications_bot` (server-side only)
- `TELEGRAM_PAYMENT_ERROR_CHAT_ID` — chat for caught internal payment errors
- `TELEGRAM_PAYMENT_CARD_ERROR_CHAT_ID` — chat for authoritative YooKassa cancellations
- `TELEGRAM_PAYMENT_SUCCESS_CHAT_ID` — chat for the first successfully processed payment transition
- `TELEGRAM_PROXY_HOST` — optional HTTP(S) CONNECT proxy hostname or IP, without a URL scheme
- `TELEGRAM_PROXY_PORT` — proxy TCP port
- `TELEGRAM_PROXY_USERNAME` — proxy username (server-side only)
- `TELEGRAM_PROXY_PASSWORD` — proxy password (server-side only)
- `TELEGRAM_PROXY_PROTOCOL` — proxy transport, one of `http`, `https`, or `socks5`
- `EASYMED_API_USERNAME` if not using the built-in fallback
- `EASYMED_API_PASSWORD` if not using the built-in fallback

All five `TELEGRAM_PROXY_*` variables must either be set together or be absent. When set,
only requests to the Telegram Bot API use the selected authenticated proxy. When
absent, Telegram uses a direct HTTPS connection. Proxy credentials and bot tokens are
never included in transport error messages.

The proxy transport has a 10-second timeout for form/error notifications and a
5-second timeout for payment notifications. A timeout while opening the proxy
socket is logged as `telegram_proxy_tcp_timeout`; proxy HTTP 407 is
`telegram_proxy_auth_failed`; other connection, TLS, Telegram timeout, and API
response failures are logged as `telegram_proxy_connect_failed`,
`telegram_proxy_tls_failed`, `telegram_api_timeout`, and
`telegram_api_http_error`. These categories never contain proxy credentials or
the bot-token URL.

To send a test notification without making a payment, load the desired configuration
into the root `.env` and run:

```bash
npm run telegram:test -- success
```

The successful output includes `transport: http_proxy`, `https_proxy`, or
`socks5_proxy` according to `TELEGRAM_PROXY_PROTOCOL`, or `transport: direct`
when the proxy variables are absent.

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