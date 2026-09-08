# YooKassa webhook service (stage 6A)

Small, dependency-free Node.js service that relays final YooKassa payment notifications to B2C. It contains no payment or subscription business logic.

## Local run

Requires Node.js 18.18 or newer. No package download is required (`npm install` is optional because there are no dependencies). Configuration is read directly from the untracked `.env` file in this directory; real secrets must never be committed.

```bash
cd yookassa-webhook
cat > .env <<'EOF'
WEBHOOK_HEALTH_SECRET=replace-with-a-random-secret
PAYMENT_INTERNAL_SECRET=replace-with-a-different-random-secret
B2C_INTERNAL_URL=http://localhost:3000
PORT=3001
EOF
npm start
```

The default port is `3001`. Required variables are `WEBHOOK_HEALTH_SECRET`, `PAYMENT_INTERNAL_SECRET`, `B2C_INTERNAL_URL`, and `PORT`. Generate the two secrets independently; only `PAYMENT_INTERNAL_SECRET` is shared with B2C.

In production, run this directory as a separate long-lived Node process (for example, a dedicated systemd service or container), set environment variables in the process manager, and place it behind a reverse proxy with a trusted TLS certificate. Expose only `POST /yookassa/webhook` to YooKassa; `/health` remains protected by its bearer secret. Set `B2C_INTERNAL_URL` to the B2C server origin and configure the same `PAYMENT_INTERNAL_SECRET` there.

The public notification is treated only as a signal. For supported payment events this service forwards `yookassaPaymentId` (plus the event as a logging hint); B2C then loads the local payment and obtains its authoritative status directly from YooKassa. A notification is acknowledged with HTTP 200 only after B2C verifies it or determines that its current provider status needs no action. Upstream and verification failures remain non-2xx so YooKassa can redeliver them.

For a real webhook check, configure `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` on B2C, configure the same independently generated `PAYMENT_INTERNAL_SECRET` on B2C and this service, set `B2C_INTERNAL_URL`, and point the YooKassa dashboard webhook URL at the public TLS endpoint ending in `/yookassa/webhook`. Subscribe only to `payment.succeeded` and `payment.canceled`.