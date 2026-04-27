import { cookies } from "next/headers";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialProvider from "next-auth/providers/credentials";
import { AUTH_TOKEN_KEY } from "@nitroberry/api-client";
import axios from "axios";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 365 * 24 * 60 * 60 },
  jwt: { maxAge: 365 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET || process.env.NEXT_AUTH_SECRET,
  providers: [
    CredentialProvider({
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        access_token: { label: "Access Token", type: "text" },
        _user: { label: "User", type: "text" },
      },
      authorize: async (credentials) => {
        const { email, password, access_token, _user } = credentials as {
          email: string;
          password: string;
          access_token: string;
          _user: string;
        };

        if (email && password) {
          try {
            const res: any = await axios.post(
              `${process.env.NEXT_PUBLIC_REST_API_ENDPOINT}/login`,
              { email, password },
              {
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": process.env.NEXT_PUBLIC_API_KEY,
                },
              },
            );
            if (res.data?.data.token) {
              const user = res.data.data.user;
              if (!user.isActive) throw new Error("Your account is not active.");
              const cookieStore = await cookies();
              cookieStore.set(AUTH_TOKEN_KEY, res.data.data.token);
              return {
                id: user.id,
                name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                email: user.email,
                role_id: user.roleName,
                username: user.firstName || "",
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                isActive: !!user.isActive,
                image_link: user.photo || "",
                token: res.data.data.token,
                companyId: user.companyId,
                country: user.country || null,
                timezone: user.timezone || null,
                themeData: null,
                companyUi: null,
              };
            }
            throw new Error(res.data.message || "Invalid credentials.");
          } catch (error: any) {
            throw new Error(
              error?.response?.data?.message || error?.message || "Login failed",
            );
          }
        }

        if (access_token && _user) {
          try {
            const user = JSON.parse(_user);
            if (!user.isActive) throw new Error("Your account is not active.");
            const cookieStore = await cookies();
            cookieStore.set(AUTH_TOKEN_KEY, access_token);
            return {
              id: user.id,
              name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
              email: user.email,
              role_id: user.roleName,
              username: user.firstName || "",
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              isActive: !!user.isActive,
              image_link: user.photo || "",
              token: access_token,
              companyId: user.companyId,
              country: user.country || null,
              timezone: user.timezone || null,
              themeData: user?.themeData ?? null,
              companyUi: user?.companyUi ?? null,
            };
          } catch (error: any) {
            throw new Error(error?.message || "Login failed");
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, trigger, user, session }) {
      if (trigger === "update") return { ...token, ...session.user };
      return { ...token, ...user };
    },
    session({ session, token }: any) {
      if (session.user) {
        Object.assign(session.user, {
          id: token.id,
          name: token.name,
          email: token.email,
          role_id: token.role_id,
          username: token.username,
          isActive: token.isActive,
          image_link: token.image_link,
          token: token.token,
          companyId: token.companyId,
          country: token.country,
          timezone: token.timezone,
          firstName: token.firstName,
          lastName: token.lastName,
          themeData: token.themeData,
          companyUi: token.companyUi,
        });
      }
      return session;
    },
  },
  cookies: {
    // Same cookie names as apps/main — sessions are shared on same domain
    sessionToken: {
      name: "nitroberry.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    callbackUrl: {
      name: "nitroberry.callback-url",
      options: { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
    csrfToken: {
      name: "nitroberry.csrf-token",
      options: { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    },
  },
};

const authHandler = NextAuth(authOptions);
export { authHandler as GET, authHandler as POST };
