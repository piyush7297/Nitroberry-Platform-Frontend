export const HTTP_METHODS = {
  GET: "get",
  POST: "post",
  PUT: "put",
  DELETE: "delete",
  PATCH: "patch",
} as const;

export type Method = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];
