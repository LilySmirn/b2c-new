import { resolve } from "node:path";
import { loadEnv } from "../config/load-env";

const routes = ["payment-success", "payment-error", "general-error", "feedback"] as const;
type TestRoute = typeof routes[number];

async function main(): Promise<void> {
    const route = process.argv[2] as TestRoute | undefined;
    if (!route || !routes.includes(route)) {
        throw new Error(`Usage: npm run telegram:test -- <${routes.join("|")}>`);
    }

    loadEnv(resolve(__dirname, ".."), true);
    const { sendTelegramNotification } = await import("../app/lib/telegramNotification");
    const types = {
        "payment-success": "payment_success",
        "payment-error": "payment_error",
        "general-error": "general_error",
        feedback: "feedback",
    } as const;
    const result = await sendTelegramNotification(
        types[route],
        `ТЕСТОВОЕ СООБЩЕНИЕ: проверка маршрута ${route}. Это не реальное событие.`,
    );
    if (!result.sent) {
        throw new Error(`Тест ${route} не пройден (reason: ${result.reason}, HTTP: ${result.status ?? "не получен"})`);
    }
    console.log(`Тест ${route} пройден (HTTP ${result.status}, transport: ${result.transport}).`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : "telegram_test_failed");
    process.exit(1);
});