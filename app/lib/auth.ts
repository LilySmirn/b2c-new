import NextAuth, {NextAuthOptions} from "next-auth";
import db from "./db";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import {v4 as uuidv4} from "uuid";
import {getAuthSecret} from "./authSecret";
import { USER_BLOCK_REASON_CODES } from "@/app/modules/userBlocking";
import { blockUser } from "@/app/modules/userBlocking/server";
import {
    normalizeLogin,
    registerLoginAttempt,
} from "@/app/modules/userBlocking/server/loginAttemptLimiter";
import { AUTH_ERROR_CODES } from "@/app/lib/authErrorCodes";
import { getForwardedIp, normalizeIp } from "@/app/lib/requestIp";

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

                const authFlow = credentials.authFlow;
                if (authFlow !== "b2c" && authFlow !== "b2b") {
                    return null;
                }

                const deviceId = credentials.deviceId?.trim() ?? "";

                if (authFlow === "b2c" && (deviceId === "" || deviceId.length > 100)) {
                    return null;
                }

                const normalizedLogin = normalizeLogin(credentials.email ?? "");
                const attempt = await registerLoginAttempt(normalizedLogin);

                try {
                    const deviceName = getDeviceName(credentials.deviceName);
                    const database = new db();
                    const user = await database.findUserByEmail(normalizedLogin);

                    const rejectFailedCredentials = async () => {
                        if (attempt.recordFailure() && user !== null) {
                            await blockUser({
                                userId: user.user_id.toString(),
                                reason: USER_BLOCK_REASON_CODES.EXCESSIVE_LOGIN_ATTEMPTS,
                            });
                        }

                        return null;
                    };

                    if (attempt.limitReached) {
                        if (user !== null) {
                            await blockUser({
                                userId: user.user_id.toString(),
                                reason: USER_BLOCK_REASON_CODES.EXCESSIVE_LOGIN_ATTEMPTS,
                            });
                        }

                        return null;
                    }

                    if (user === null || user.password_hash === null) {
                        return rejectFailedCredentials();
                    }

                    if (user.blocked) {
                        return null;
                    }

                    if (user.account_type !== authFlow) {
                        return rejectFailedCredentials();
                    }

                    const isValid = await bcrypt.compare(credentials.password ?? "", user.password_hash!);
                    if (!isValid) {
                        return rejectFailedCredentials();
                    }

                    // A valid password must not contribute to the brute-force
                    // threshold, even when sign-in is denied for another reason
                    // such as a pending email confirmation.
                    attempt.reset();

                    if (authFlow === "b2c" && user.email_verified_at === null) {
                        throw new Error(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
                    }

                    if (authFlow === "b2b") {
                        const allowedIp = normalizeIp(user.ip);
                        const clientIp = getForwardedIp(req.headers);

                        if (allowedIp !== null && allowedIp !== clientIp) {
                            console.warn("B2B login rejected: IP mismatch");
                            return null;
                        }
                    }

                    let sessionId: string | undefined;

                    if (authFlow === "b2c") {
                        const expiresAt = getB2cSessionExpiresAt();
                        sessionId = uuidv4();

                        await database.createB2cSessionReplacingExisting({
                            sessionId,
                            userId: user.user_id.toString(),
                            deviceId,
                            deviceName,
                            ipAddress: getForwardedIp(req.headers),
                            expiresAt,
                        });
                    }

                    return {
                        id: user.user_id.toString(),
                        email: user.login,
                        name: user.name,
                        accountType: authFlow,
                        sessionId,
                        };
                } finally {
                    attempt.release();
                }

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
                token.accountType = user.accountType;
                token.sessionId = user.sessionId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && typeof token.sub === "string") {
                session.user.id = token.sub;
                session.user.name = token.name;
                session.user.email = token.email;

                if (token.accountType !== undefined) {
                    session.user.accountType = token.accountType;
                }
            }

            if (token.sessionId !== undefined) {
                session.sessionId = token.sessionId;
            }

            return session;
        },
    },
    secret: getAuthSecret(),
};