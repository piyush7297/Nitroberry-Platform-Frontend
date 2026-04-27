export const errorResponse = (error: any) => {
  if (typeof window === "undefined") {
    return null;
  }
  let message = "Oops, something went wrong";
  if (error && error.response) {
    const response = error.response;

    if (response.data?.detail) {
      message = response.data.detail;
    } else if (
      response.data?.error &&
      typeof response.data.error === "string"
    ) {
      message = response.data.error;
    } else if (response.data?.message) {
      message =
        typeof response.data.message === "string"
          ? response.data.message
          : response.data.message.message || "Oops, something went wrong";
    } else if (
      response.data?.error &&
      typeof response.data.error === "object" &&
      !Array.isArray(response.data.error)
    ) {
      const firstKey = Object.keys(response.data.error)[0];
      const firstError = response.data.error[firstKey];
      if (Array.isArray(firstError) && firstError.length > 0) {
        message = firstError[0];
      }
    }
  }

  return message;
};
