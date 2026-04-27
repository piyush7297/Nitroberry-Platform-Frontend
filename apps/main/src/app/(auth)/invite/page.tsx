"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { API_ENDPOINTS } from "@/api/endpoints";
import { client } from "@/api/client";
import { toast } from "@/hooks/use-toast";

export default function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  //   useEffect(() => {
  //     if (!token) return;

  //     async function verifyInvite() {
  //       try {
  //         const res = await fetch(`/api/v1/auth/invite?token=${token}`);
  //         if (!res.ok) throw new Error("Invalid invite token");

  //         setStatus("success");
  //         setTimeout(() => router.push("/auth/register"), 2000);
  //       } catch {
  //         setStatus("error");
  //       }
  //     }

  //     verifyInvite();
  //   }, [token, router]);

  const verifyInvite = async () => {
    try {
      await client.get(`${API_ENDPOINTS.AUTH_VERIFY_INVITE}?token=${token}`);
      setStatus("success");
      setTimeout(() => router.replace("/auth/login"), 2000);
    } catch (error: any) {
      setStatus("error");
      console.log(error.response.data.message);
      toast({
        title: "Error!",
        description: error?.response?.data?.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!token) return;
    verifyInvite();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      {status === "loading" && (
        <>
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">
            Verifying your invitation...
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Invitation Verified!</h2>
          <p className="text-muted-foreground mb-4">
            Redirecting you to registration...
          </p>
          <Button onClick={() => router.push("/auth/register")}>
            Continue to Registration
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="w-10 h-10 text-red-600 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            Invalid or Expired Link
          </h2>
          <p className="text-muted-foreground mb-4">
            Please request a new invitation link.
          </p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </>
      )}
    </div>
  );
}
