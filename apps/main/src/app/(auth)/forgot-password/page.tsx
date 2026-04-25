"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useApiMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Mail, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const forgotPassoword = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.FORGOT_PASSWORD,
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);

    forgotPassoword.mutate(
      { email: email.toLowerCase() },
      {
        onSuccess: async () => {
          setLoading(false);
        },
        onError: (err) => {
          setLoading(false);
        },
      },
    );
    // Simulate request
    // setTimeout(() => {
    //   toast.success("Password reset link sent to your email!")
    //   router.push("/login")
    // }, 1200)
  };

  return (
    <div className="min-h-svh bg-[#020202] text-white flex flex-col relative overflow-hidden">
      {/* Purple Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle at 22% 50%, rgba(140, 51, 234, 0.28) 0%, transparent 52%)",
        }}
      />

      <div className="flex flex-col lg:flex-row flex-1 relative z-10 container mx-auto">
        {/* LEFT SIDE */}
        <div className="flex lg:w-[58%] flex-col p-6 lg:p-16 justify-center">
          <div className="flex items-center gap-3 mb-8 lg:mb-16">
            <img
              src="/images/nitroberry-logo.png"
              alt="NitroBerry logo"
              className="h-12 w-12 rounded-lg bg-white object-contain shadow-lg shadow-purple-900/40"
            />
            <div className="flex flex-col">
              <span className="text-white font-semibold text-xl">
                NitroBerry
              </span>
              <span className="text-gray-400 text-xs">
                Industrial Automation Platform
              </span>
            </div>
          </div>

          <h1 className="hidden lg:block text-6xl font-bold leading-tight max-w-2xl mb-6">
            Reset your <span className="text-primary">password</span> securely.
          </h1>

          <p className="hidden lg:block text-gray-400 text-lg max-w-xl mb-10">
            Enter your email address and we'll send you a secure link to reset
            your password and regain access to your account.
          </p>

          <div className="hidden lg:grid grid-cols-2 gap-4 max-w-lg">
            {[
              "Secure reset process",
              "Email verification",
              "Quick recovery",
              "24/7 support",
            ].map((item, i) => (
              <div
                key={i}
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-5 py-4 flex items-center gap-3"
              >
                <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"></div>
                <span className="text-white text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 lg:w-[42%] flex items-center justify-center p-6 lg:p-20">
          <div className="w-full max-w-md">
            <Card className="bg-[#0f0f0f] border border-[#2a2a2a] shadow-2xl shadow-black/40 rounded-2xl">
              <CardContent className="p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex flex-col gap-2 mb-4">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Forgot Password
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Enter your email to receive a password reset link.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-gray-400 text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-gray-600 pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    variant="default"
                    className="w-full"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                    <ArrowRight className="w-4 h-4 ml-2 text-white" />
                  </Button>

                  <p className="text-center text-xs text-gray-400">
                    Remember your password?{" "}
                    <Link
                      href="/login"
                      className="text-primary hover:text-purple-400 hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
