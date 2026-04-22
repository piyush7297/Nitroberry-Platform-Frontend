"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useFormik } from "formik";
import { loginSchema } from "@/lib/validationsSchema";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      handleSubmit(values);
    },
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    const { email, password } = values;
    const res = await signIn("credentials", {
      redirect: false,
      email: email.toLowerCase(),
      password,
    });
    setLoading(false);

    if (res?.error) {
      toast({
        title: "Error!",
        description: res.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success!",
      description: "Login successful",
      variant: "default",
    });
    router.push("/dashboard");
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
              src="/images/nitro-fms-logo.jpeg"
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
            Sign in to <span className="text-primary">supercharge</span> your
            operations.
          </h1>

          <p className="hidden lg:block text-gray-400 text-lg max-w-xl mb-10">
            Centralize flow management, automate processes, and unlock real-time
            insights with a secure, fast, and elegant experience.
          </p>

          <div className="hidden lg:grid grid-cols-2 gap-4 max-w-lg">
            {[
              "Single-sign-on ready",
              "Email magic link",
              "Role-based access",
              "Audit logs & 2FA",
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
                <form onSubmit={formik.handleSubmit} className="space-y-6">
                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-gray-400 text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Email"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.email}
                        className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-gray-600 pl-10"
                      />
                    </div>
                    {formik.touched.email && formik.errors.email && (
                      <span className="text-red-500 text-xs">
                        {formik.errors.email}
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-gray-400 text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
                      <Input
                        id="password"
                        name="password"
                        type={"password"}
                        placeholder="Password"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.password}
                        className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-gray-600 pl-10 pr-10"
                      />
                    </div>
                    {formik.touched.password && formik.errors.password && (
                      <span className="text-red-500 text-xs">
                        {formik.errors.password}
                      </span>
                    )}
                  </div>

                  {/* Remember + Forgot */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(c) => setRememberMe(c === true)}
                        className="border-gray-600 bg-transparent data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 data-[state=checked]:text-white rounded"
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm text-white cursor-pointer"
                      >
                        Remember me
                      </Label>
                    </div>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary hover:text-purple-400 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    variant="default"
                    className="w-full"
                  // className="w-full bg-gradient-to-r from-purple-700 to-purple-500 text-white py-5 text-base rounded-xl hover:shadow-lg hover:shadow-purple-900/30 transition"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                    <ArrowRight className="w-4 h-4 ml-2 text-white" />
                  </Button>

                  <p className="text-center text-xs text-gray-400">
                    By continuing, you agree to our{" "}
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://nitroberry.com/terms"
                      className="underline"
                    >
                      Terms
                    </a>
                    ,
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://nitroberry.com/privacy-policy"
                      className="underline"
                    >
                      {" "}
                      Privacy
                    </a>
                    , and
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://nitroberry.com/cookie-policy"
                      className="underline"
                    >
                      {" "}
                      Cookie Policy
                    </a>
                    .
                  </p>
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-sm mt-5">
              <span className="text-gray-400">New to NitroBerry? </span>
              <Link href="/register" className="text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
