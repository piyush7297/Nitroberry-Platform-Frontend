import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { apiCall } from "../api/apiFunction";

type Method = "get" | "post" | "put" | "delete" | "patch";

// For GET requests (useQuery)
export const useApiQuery = <TData = any>(
  key: readonly unknown[], // 🛠️ Use correct queryKey type
  url: string,
  options?: Omit<
    UseQueryOptions<TData, Error, TData, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
  requestConfig?: Record<string, any>,
): UseQueryResult<TData, Error> => {
  return useQuery<TData, Error, TData, readonly unknown[]>({
    queryKey: key,
    queryFn: () => apiCall<TData>("get" as Method, url, undefined, requestConfig),
    ...options,
  });
};

// For POST/PUT/DELETE (useMutation)
export const useApiMutation = <TData = any, TVariables = any>(
  method: Method,

  url: string,
  // customHeaders?: Record<string, string >, //for custom header
  options?: UseMutationOptions<TData, Error, TVariables>,
) => {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables: TVariables) =>
      apiCall<TData>(method, url, variables),
    ...options,
  });
};

export const useStatusMutation = <
  TData = any,
  TVariables extends { groupId?: string;[key: string]: any } = any,
>(
  method: Method,
  url: string | ((variables: TVariables) => string),
  options?: UseMutationOptions<TData, Error, TVariables>,
) => {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables: TVariables) => {
      const finalUrl = typeof url === "function" ? url(variables) : url;
      // Remove groupId from the body
      const body = { ...variables };
      if ("groupId" in body) delete body.groupId;
      return apiCall<TData>(method, finalUrl, body);
    },
    ...options,
  });
};

export const usePaginatedApiQuery = <TData = any>(
  key: readonly unknown[],
  url: string,
  params: Record<string, any>,
  options?: Omit<
    UseQueryOptions<TData, Error, TData, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<TData, Error> => {
  return useQuery<TData, Error, TData, readonly unknown[]>({
    queryKey: [...key, params], // key includes pagination params
    queryFn: () => apiCall<TData>("get", url, params),
    ...options,
  });
};

export const useApiMutationFormData = <TData = any, TVariables = any>(
  method: Method,
  url: string,
  customHeaders?: Record<string, string>, // 👈 Added custom headers support
  options?: UseMutationOptions<TData, Error, TVariables>,
) => {
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables: TVariables) =>
      apiCall<TData>(method, url, variables, {
        headers: { "Content-Type": "multipart/form-data", ...customHeaders },
      }),
    ...options,
  });
};
