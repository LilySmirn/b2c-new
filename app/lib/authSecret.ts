/**
 * NextAuth requires a stable secret in production. Local development can
 * generate one implicitly, but the production runtime deliberately refuses to
 * do that because sessions would become invalid after a restart.
 *
 * AUTH_SECRET remains supported when it is configured. On installations that
 * only provide database settings, use the database password as the private
 * entropy and add application-specific context so this value is not identical
 * to the password itself.
 */
export function getAuthSecret(): string {
    const configuredSecret = process.env.AUTH_SECRET?.trim();

    if (configuredSecret) {
        return configuredSecret;
    }

    const databasePassword = process.env.DB_PASSWORD?.trim();

    if (!databasePassword) {
        // Next.js evaluates route modules while collecting build metadata, when
        // deployment-only environment variables may intentionally be absent.
        // The built server evaluates this module again with its runtime env.
        if (process.env.NEXT_PHASE === "phase-production-build") {
            return "next-production-build-placeholder";
        }

        throw new Error("Set either AUTH_SECRET or DB_PASSWORD for authentication");
    }

    return [
        "klinrec-next-auth",
        process.env.DB_HOST ?? "",
        process.env.DB_PORT ?? "3306",
        process.env.DB_NAME ?? "",
        process.env.DB_USER ?? "",
        databasePassword,
    ].join(":");
}