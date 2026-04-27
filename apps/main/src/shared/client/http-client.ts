import { getAuthToken } from "@/api/token";
import axios from "axios";

const Axios = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_REST_API_ENDPOINT}`,
  timeout: 150000000,
  headers: {
    "Content-Type": "application/json",
    // "Access-Control-Allow-Origin": "*",
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY,
  },
});

Axios.interceptors.request.use(
  async (config: any) => {
    const token = await getAuthToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (!isFormData && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error),
);

Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 ||
        error.response.status === "HTTP_401_UNAUTHORIZED")
    ) {
      // removeAuthToken();
      // window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export class HttpClient {
  static async get<T>(url: string, params: any = {}) {
    const { signal, ...rest } = params;
    try {
      const response = await Axios.get<T>(url, { ...rest, signal });
      return response.data;
    } catch (error: any) {
      console.error("HTTP GET Error:", url, error.message, error);
      throw error;
    }
  }

  static async post<T>(url: string, data: unknown, options: any = {}) {
    const isFormData = data instanceof FormData;

    const config = {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options?.headers || {}),
      },
    };

    const response = await Axios.post<T>(url, data, config);
    return response.data;
  }

  static async put<T>(url: string, data: unknown, options: any = {}) {
    const response = await Axios.put<T>(url, data, options);
    return response.data;
  }

  static async patch<T>(url: string, data: unknown, options: any = {}) {
    const response = await Axios.patch<T>(url, data, options);
    return response.data;
  }

  static async delete<T>(url: string) {
    const response = await Axios.delete<T>(url);
    return response.data;
  }

  static async deleteWithBody<T>(url: string, data: any) {
    const response = await Axios.delete<T>(url, { data });
    return response.data;
  }
}
