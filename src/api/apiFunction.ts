import { signOut } from "next-auth/react";
import { client } from "./client";
import { Method } from "./methods";
import { toast } from "@/hooks/use-toast";
import { removeAuthToken } from "./token";

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

    // ✅ Show success toast only if NOT a GET request
    if (method.toLowerCase() !== "get" && response?.data?.message) {
      toast({
        title: "Success!",
        description: response.data.message,
        variant: "default",
      });
    }

    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const errData = error?.response?.data;

    const errMsg =
      errData?.error?.message || errData?.message || "Something went wrong!";

    if ([400, 401, 404, 422, 500].includes(status)) {
      if (errData?.token === false) {
        toast({
          title: "Session Expired!",
          description: errMsg,
          variant: "default",
        });
        removeAuthToken();
        localStorage.clear();
        await signOut({ redirect: true, callbackUrl: "/login" });
      } else if (errMsg === "UNAUTHORIZED") {
        toast({
          title: "Unauthorized!",
          description: errMsg,
          variant: "destructive",
        });
        removeAuthToken();
        localStorage.clear();
        await signOut({ redirect: true, callbackUrl: "/login" });
      } else {
        toast({
          title: "Failed!",
          description: errMsg,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Failed!",
        description: errMsg,
        variant: "destructive",
      });
    }

    throw error;
  }
};
