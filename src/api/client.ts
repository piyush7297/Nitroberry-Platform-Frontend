import axios from "axios";
import { getAuthToken } from "./token";

const Axios = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_REST_API_ENDPOINT}`,
  timeout: 150000000,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY,
  },
});
// Change request data/error here
Axios.interceptors.request.use(
  async (config: any) => {
    const token = await getAuthToken();
    config.headers = {
      ...config.headers,
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      (error.response && error.response.status === 401) ||
      (error.response && error.response.status === 403)
    ) {
      // removeAuthToken();
      //   Router.reload();
    }
    return Promise.reject(error);
  },
);

export const client = Axios;
