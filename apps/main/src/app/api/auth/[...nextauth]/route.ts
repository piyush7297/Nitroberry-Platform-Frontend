import { cookies } from "next/headers";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialProvider from "next-auth/providers/credentials";
import { AUTH_TOKEN_KEY } from "@/api/token";
import axios from "axios";

const sanitizeLoginResponse = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const cloned = JSON.parse(JSON.stringify(payload));
  const data = (cloned as { data?: Record<string, unknown> }).data;

  if (data && typeof data === "object") {
    if ("token" in data) {
      data.token = "***redacted***";
    }
    if ("socketToken" in data) {
      data.socketToken = "***redacted***";
    }
  }

  return cloned;
};

const extractThemeData = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;
  const user =
    data?.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : null;
  const company =
    data?.company && typeof data.company === "object"
      ? (data.company as Record<string, unknown>)
      : null;

  return data?.theme ?? user?.theme ?? company?.theme ?? root.theme ?? null;
};

const extractCompanyUiData = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;
  const user =
    data?.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : null;
  const company =
    data?.company && typeof data.company === "object"
      ? (data.company as Record<string, unknown>)
      : null;

  return (
    data?.companyUi ??
    user?.companyUi ??
    company?.companyUi ??
    (company?.uiSettings ? { uiSettings: company.uiSettings } : null) ??
    root.companyUi ??
    null
  );
};

const logExpandedJson = (label: string, value: unknown) => {
  if (value === null || value === undefined) {
    console.log(label, value);
    return;
  }

  try {
    console.log(`${label}\n${JSON.stringify(value, null, 2)}`);
  } catch {
    console.log(label, value);
  }
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 365 * 24 * 60 * 60,
  },
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
        let messageText = "Login failed";
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

            console.log(
              "[Auth] Login response (sanitized):",
              sanitizeLoginResponse(res?.data),
            );


            console.log(
              "[Auth] Theme data from login response:",
              extractThemeData(res?.data),
            );
            const loginThemeData = extractThemeData(res?.data);
            const loginCompanyUi = extractCompanyUiData(res?.data);
            logExpandedJson(
              "[Auth] companyUi from login response:",
              loginCompanyUi,
            );

            if (res.data?.data.token) {
              
              const user = res.data.data.user;

              if (!user.isActive) {
                throw new Error(
                  "Your account is not active. Please contact admin.",
                );
              }
              const socketToken = res.data.data.socketToken || "";
              const cookieStore = await cookies();
              cookieStore.set(AUTH_TOKEN_KEY, res.data.data.token);

              if (socketToken) {
                cookieStore.set("socketToken", socketToken);
              } else {
                cookieStore.delete("socketToken");
              }

              cookieStore.set("email", user.email || "");

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
                themeData: loginThemeData,
                companyUi: loginCompanyUi,
              };
            }

            throw new Error(res.data.message || "Invalid credentials.");
          } catch (error: any) {
            if (
              error?.response &&
              error?.response?.data &&
              error?.response?.data?.message
            ) {
              throw new Error(error?.response?.data?.message);
            } else if (error instanceof Error && error.message) {
              throw error;
            }
            throw new Error(error?.response?.data?.message || messageText);
          }
        }

        if (access_token && _user) {
          let cc_email_verify = "";
          const user = JSON.parse(_user);
          logExpandedJson(
            "[Auth] companyUi from credentials payload:",
            user?.companyUi ?? null,
          );
          try {
            if (!user.isActive) {
              cc_email_verify =
                "Your account is not active. Please contact admin.";
              const cookieStore = await cookies();
              cookieStore.set("email", email);
              throw Error(cc_email_verify);
            }
            const cookieStore = await cookies();
            cookieStore.set(AUTH_TOKEN_KEY, access_token);
            cookieStore.delete("socketToken");

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
              themeData: user?.themeData ?? user?.theme ?? null,
              companyUi: user?.companyUi ?? null,
            };
          } catch (error: any) {
            if (
              error?.response &&
              error?.response?.data &&
              error?.response?.data?.message
            ) {
              throw new Error(error?.response?.data?.message);
            } else if (error instanceof Error && error.message) {
              throw error;
            }
            throw new Error(error?.response?.data?.message || messageText);
          }
        }
        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, trigger, user, session }) {
      if (trigger === "update") {
        return { ...token, ...session.user };
      }
      return { ...token, ...user };
    },

    session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role_id = token.role_id;
        session.user.username = token.username;
        session.user.isActive = token.isActive;
        session.user.image_link = token.image_link;
        session.user.token = token.token;
        session.user.companyId = token.companyId;
        session.user.country = token.country;
        session.user.timezone = token.timezone;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.themeData = token.themeData;
        session.user.companyUi = token.companyUi;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: `nitroberry.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `nitroberry.callback-url`,
      options: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `nitroberry.csrf-token`,
      options: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

const authHandler = NextAuth(authOptions);
export { authHandler as GET, authHandler as POST };
