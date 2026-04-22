import axios from "axios";

// Public API client without authentication
const publicAxios = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_REST_API_ENDPOINT}`,
  timeout: 150000000,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY,
  },
});

export const publicApiCall = async <T = any>(
  method: "get" | "post" | "put" | "delete" | "patch",
  url: string,
  data?: any,
): Promise<T> => {
  try {
    const response = await publicAxios.request<T>({
      method,
      url,
      ...(method === "get" ? { params: data } : { data }),
    });
    return response.data;
  } catch (error: any) {
    const errData = error?.response?.data;
    const errMsg =
      errData?.error?.message || errData?.message || "Something went wrong!";
    throw new Error(errMsg);
  }
};
