import NextAuth, {NextAuthOptions} from "next-auth";
import db from "./db";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {},
                password: {},
            },
            async authorize(credentials) {
                if (credentials === null || credentials === undefined) {
                    return null;
                }

                const user = await new db().findUserByEmail(credentials?.email ?? "");

                if (user === null || user.password_hash === null) {
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password, user.password_hash!);
                if (!isValid) {
                    return null;
                }

                return { id: user.user_id.toString(), email: user.login, name: user.name };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
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