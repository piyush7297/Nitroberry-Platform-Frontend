"use client";
import { useFormik } from "formik";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { useApiMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Checkbox } from "@/components/ui/checkbox";
import { registerSchema } from "@/lib/validationsSchema";
import { Mail, Lock, ArrowRight, User } from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const signUp = useApiMutation(HTTP_METHODS.POST, API_ENDPOINTS.REGISTER);

  const handleSave = (values: any) => {
    values.email = values.email.toLowerCase();
    setLoading(true);
    signUp.mutate(values, {
      onSuccess: async () => {
        setLoading(false);
      },
      onError: (err) => {
        setLoading(false);
      },
    });
  };

  const formik = useFormik({
    initialValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      terms: false,
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      const { terms, ...payload } = values;
      handleSave(payload);
    },
  });

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
            Create your <span className="text-primary">account</span> and get
            started.
          </h1>

          <p className="hidden lg:block text-gray-400 text-lg max-w-xl mb-10">
            Join thousands of enterprises using NitroBerry to streamline
            operations, automate workflows, and drive efficiency.
          </p>

          <div className="hidden lg:grid grid-cols-2 gap-4 max-w-lg">
            {[
              "Enterprise-grade security",
              "Real-time analytics",
              "Custom workflows",
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
                <form onSubmit={formik.handleSubmit} className="space-y-6">
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-gray-400 text-sm">
                        First name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
                        <Input
                          id="first_name"
                          name="firstName"
                          type="text"
                          placeholder="First name"
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          value={formik.values.firstName}
                          className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-gray-600 pl-10"
                        />
                      </div>
                      {formik.touched.firstName && formik.errors.firstName && (
                        <span className="text-red-500 text-xs">
                          {formik.errors.firstName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-gray-400 text-sm">Last name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
                        <Input
                          id="last_name"
                          name="lastName"
                          type="text"
                          placeholder="Last name"
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          value={formik.values.lastName}
                          className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-gray-600 pl-10"
                        />
                      </div>
                      {formik.touched.lastName && formik.errors.lastName && (
                        <span className="text-red-500 text-xs">
                          {formik.errors.lastName}
                        </span>
                      )}
                    </div>
                  </div>

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
                        type="password"
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

                  {/* Terms */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="terms"
                      name="terms"
                      checked={formik.values.terms}
                      onCheckedChange={(checked) =>
                        formik.setFieldValue("terms", checked)
                      }
                      className="border-gray-600 bg-transparent data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 data-[state=checked]:text-white rounded"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm text-white cursor-pointer"
                    >
                      I agree to the{" "}
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://nitroberry.com/terms"
                        className="underline hover:text-purple-400"
                      >
                        Terms
                      </a>{" "}
                      and{" "}
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://nitroberry.com/privacy-policy"
                        className="underline hover:text-purple-400"
                      >
                        Privacy
                      </a>
                      .
                    </Label>
                  </div>
                  {formik.touched.terms && formik.errors.terms && (
                    <span className="text-red-500 text-xs">
                      {formik.errors.terms}
                    </span>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    variant="default"
                    className="w-full"
                  >
                    {loading ? "Registering..." : "Register"}
                    <ArrowRight className="w-4 h-4 ml-2 text-white" />
                  </Button>

                  {/* <p className="text-center text-xs text-gray-400">
                    By continuing, you agree to our <Link href="#" className="underline">Terms</Link>,
                    <Link href="#" className="underline"> Privacy</Link>, and
                    <Link href="#" className="underline"> Cookie Policy</Link>.
                  </p> */}
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-sm mt-5">
              <span className="text-gray-400">Already have an account? </span>
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
