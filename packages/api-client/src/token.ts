import { ConfigValue } from "@nitroberry/shared";
import Cookies from "js-cookie";
import { getSession } from "next-auth/react";

export const AUTH_TOKEN_KEY = ConfigValue.AUTH_TOKEN_KEY!;
export const CORDINATE = "CORDINATE";
export const IP_ADDRESS_STORAGE = "IP_ADDRESS";
export const BROWSER_STORAGE = "BROWSER";
export const OS_STORAGE = "OS";
export const CITY_STORAGE = "CITY";
export const COUNTRY_STORAGE = "COUNTRY";
export const DEVICE_STORAGE = "DEVICE";
export const DEVICE_ANALYTICS_STORAGE = "DEVICE_ANALYTICS";

const SESSION_TOKEN_CACHE_TTL_MS = 60 * 1000;

let cachedSessionToken: string | null = null;
let cachedSessionTokenExpiresAt = 0;
let sessionTokenPromise: Promise<string | null> | null = null;

const isBrowser = () => typeof window !== "undefined";

const setSessionTokenCache = (token: string | null) => {
  cachedSessionToken = token;
  cachedSessionTokenExpiresAt = Date.now() + SESSION_TOKEN_CACHE_TTL_MS;
};

export const getSessionAuthToken = async () => {
  if (!isBrowser()) return null;

  if (Date.now() < cachedSessionTokenExpiresAt) return cachedSessionToken;

  if (sessionTokenPromise) return sessionTokenPromise;

  sessionTokenPromise = (async () => {
    try {
      const session = await getSession();
      if (session?.user && "token" in session.user) {
        const sessionToken = (session.user as any).token;
        if (sessionToken) {
          setAuthToken(sessionToken);
          setSessionTokenCache(sessionToken);
          return sessionToken;
        }
      }
    } catch (error) {
      console.warn("Failed to get session token:", error);
    } finally {
      sessionTokenPromise = null;
    }
    setSessionTokenCache(null);
    return null;
  })();

  return sessionTokenPromise;
};

export const getAuthToken = async () => {
  if (!isBrowser()) return null;

  const cookieToken = Cookies.get(AUTH_TOKEN_KEY);
  if (cookieToken) {
    if (cachedSessionToken !== cookieToken || Date.now() >= cachedSessionTokenExpiresAt) {
      setSessionTokenCache(cookieToken);
    }
    return cookieToken;
  }

  return getSessionAuthToken();
};

export function setAuthToken(token: string) {
  Cookies.set(AUTH_TOKEN_KEY, token, { expires: 365 });
  setSessionTokenCache(token);
}

export function removeAuthToken() {
  Cookies.remove(AUTH_TOKEN_KEY);
  cachedSessionToken = null;
  cachedSessionTokenExpiresAt = 0;
  sessionTokenPromise = null;
}

export const getLocalStorage = async (KEY: string) => {
  if (!isBrowser()) return null;
  return Cookies.get(KEY);
};
