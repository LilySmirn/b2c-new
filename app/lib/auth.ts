import NextAuth, {NextAuthOptions} from "next-auth";
import db from "./db";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import {v4 as uuidv4} from "uuid";

const DEFAULT_NEXT_AUTH_JWT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function getB2cSessionExpiresAt(): Date {
    return new Date(Date.now() + DEFAULT_NEXT_AUTH_JWT_MAX_AGE_SECONDS * 1000);
}

function getBrowserName(userAgent: string): string {
    if (/Edg\//.test(userAgent)) {
        return "Edge";
    }

    if (/OPR\//.test(userAgent) || /Opera\//.test(userAgent)) {
        return "Opera";
    }

    if (/Firefox\//.test(userAgent)) {
        return "Firefox";
    }

    if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) {
        return "Chrome";
    }

    if (/Safari\//.test(userAgent)) {
        return "Safari";
    }

    return "Unknown browser";
}

function getOperatingSystemName(userAgent: string): string {
    if (/Android/i.test(userAgent)) {
        return "Android";
    }

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
        return "iOS";
    }

    if (/Windows NT/i.test(userAgent)) {
        return "Windows";
    }

    if (/Mac OS X|Macintosh/i.test(userAgent)) {
        return "macOS";
    }

    if (/Linux/i.test(userAgent)) {
        return "Linux";
    }

    return "Unknown OS";
}

function getDeviceName(userAgent: string | undefined): string | null {
    const normalizedUserAgent = userAgent?.trim();

    if (normalizedUserAgent === undefined || normalizedUserAgent === "") {
        return null;
    }

    return `${getBrowserName(normalizedUserAgent)} on ${getOperatingSystemName(normalizedUserAgent)}`.slice(0, 255);
}

function getForwardedIp(headers: Record<string, string | string[] | undefined> | undefined): string | null {
    const forwardedFor = headers?.["x-forwarded-for"];
    const rawValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const firstIp = rawValue?.split(",")[0]?.trim();

    return firstIp === undefined || firstIp === "" ? null : firstIp.slice(0, 45);
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {},
                password: {},
                authFlow: {},
                deviceId: {},
                deviceName: {},
            },
            async authorize(credentials, req) {
                if (credentials === null || credentials === undefined) {
                    return null;
                }

                const deviceId = credentials.deviceId?.trim() ?? "";

                if (credentials.authFlow === "b2c" && (deviceId === "" || deviceId.length > 100)) {
                    return null;
                }

                const deviceName = getDeviceName(credentials.deviceName);

                const user = await new db().findUserByEmail(credentials?.email ?? "");

                if (user === null || user.password_hash === null) {
                    return null;
                }

                if (credentials.authFlow !== "b2c" || user.account_type !== "b2c") {
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password, user.password_hash!);
                if (!isValid) {
                    return null;
                }

                const expiresAt = getB2cSessionExpiresAt();

                await new db().createB2cUserSession({
                    sessionId: uuidv4(),
                    userId: user.user_id.toString(),
                    deviceId,
                    deviceName,
                    ipAddress: getForwardedIp(req.headers),
                    expiresAt,
                });

                return { id: user.user_id.toString(), email: user.login, name: user.name };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: DEFAULT_NEXT_AUTH_JWT_MAX_AGE_SECONDS,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.name = user.name;
                token.email = user.email;
                token.sub = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && typeof token.sub === 'string') {
                session.user.id = token.sub;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
            }

            return session;
        },
    },
    secret: process.env.AUTH_SECRET,
};