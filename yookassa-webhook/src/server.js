import "./load-env.js";
import { createWebhookServer } from "./app.js";

const config = {
    webhookHealthSecret: process.env.WEBHOOK_HEALTH_SECRET,
    paymentInternalSecret: process.env.PAYMENT_INTERNAL_SECRET,
    b2cInternalUrl: process.env.B2C_INTERNAL_URL,
};
const port = Number(process.env.PORT ?? 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    process.stderr.write(`${JSON.stringify({ timestamp: new Date().toISOString(), errorCategory: "invalid_configuration", message: "PORT must be a valid TCP port" })}\n`);
    process.exit(1);
}

createWebhookServer(config).listen(port, () => {
    process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), event: "server_started", port })}\n`);
});