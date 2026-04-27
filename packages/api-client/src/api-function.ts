import { signOut } from "next-auth/react";
import { client } from "./client";
import type { Method } from "./methods";
import { removeAuthToken } from "./token";

export type ToastFn = (opts: {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}) => void;

let _toast: ToastFn | null = null;

export function registerToast(fn: ToastFn) {
  _toast = fn;
}

function notify(opts: Parameters<ToastFn>[0]) {
  _toast?.(opts);
}

export const apiCall = async <T = any>(
  method: Method,
  url: string,
  data?: any,
  config: Record<string, any> = {},
): Promise<T> => {
  try {
    const response: any = await client.request<T>({
      method,
      url,
      ...(method === "get" ? { params: data } : { data }),
      ...config,
    });

    if (method.toLowerCase() !== "get" && response?.data?.message) {
      notify({ title: "Success!", description: response.data.message, variant: "default" });
    }

    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const errData = error?.response?.data;
    const errMsg = errData?.error?.message || errData?.message || "Something went wrong!";

    if ([400, 401, 404, 422, 500].includes(status)) {
      if (errData?.token === false) {
        notify({ title: "Session Expired!", description: errMsg, variant: "default" });
        removeAuthToken();
        localStorage.clear();
        await signOut({ redirect: true, callbackUrl: "/login" });
      } else if (errMsg === "UNAUTHORIZED") {
        notify({ title: "Unauthorized!", description: errMsg, variant: "destructive" });
        removeAuthToken();
        localStorage.clear();
        await signOut({ redirect: true, callbackUrl: "/login" });
      } else {
        notify({ title: "Failed!", description: errMsg, variant: "destructive" });
      }
    } else {
      notify({ title: "Failed!", description: errMsg, variant: "destructive" });
    }

    throw error;
  }
};
