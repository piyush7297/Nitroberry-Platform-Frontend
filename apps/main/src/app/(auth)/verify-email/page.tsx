"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { signIn } from "next-auth/react";
import { RoutesEnum } from "@/lib/enums/routes.enum";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // Verify if token exists
  const {
    data: res,
    isLoading,
    isError,
  } = useApiQuery(
    ["EMAIL_VERIFY", token],
    token ? `${API_ENDPOINTS.AUTH_EMAIL_VERIFY}?token=${token}` : "",
    {
      enabled: !!token,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  // Redirect after success or failure
  useEffect(() => {
    const run = async () => {
      if (!token) {
        router.push(RoutesEnum.LOGIN);
        return;
      }

      if (isLoading) return;

      if (res?.data?.token) {
        await signIn("credentials", {
          access_token: res.data.token,
          _user: JSON.stringify(res.data.user),
          redirect: false,
        });
        router.push("/dashboard");
      } else {
        // Redirect to login if verification failed or no token in response
        router.push(RoutesEnum.LOGIN);
      }
    };

    run();
  }, [token, res?.data, isLoading, router]);

  // ---------- UI Logic ----------

  // No token provided
  if (!token) {
    return null; // Will redirect in useEffect
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Verifying your email...</p>
      </div>
    );
  }

  // Success state
  if (res?.data?.token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Email Verified!</h2>
        <p className="text-muted-foreground mb-4">
          Redirecting to dashboard...
        </p>
      </div>
    );
  }

  // Error or no token in response - will redirect in useEffect
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Redirecting...</p>
    </div>
  );
}
