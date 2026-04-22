"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setLoading(false);
      toast({
        title: "Error!",
        description: res.error,
        variant: "destructive",
      });
      return;
    } else {
      setLoading(false);

      toast({
        title: "Success!",
        description: "Login successful",
        variant: "default",
      });
      router.push("/dashboard");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex justify-center">
        <img
          src="/images/nitro-fms-logo.jpeg"
          alt="NitroBerry logo"
          className="h-16 w-16 rounded-lg bg-white object-contain shadow-lg"
        />
      </div>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your enterprise FMS account
                </p>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="username">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>

              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>

              {/* Optional demo accounts */}
              {/* <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2 text-start">
                  Demo Accounts
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
                  {[
                    {
                      user: "superadmin",
                      email: "superadmin@example.com",
                      pass: "admin123",
                    },
                    {
                      user: "admin1",
                      email: "admin1@example.com",
                      pass: "admin123",
                    },
                    {
                      user: "manager1",
                      email: "manager1@example.com",
                      pass: "manager123",
                    },
                  ].map((demo) => (
                    <Button
                      key={demo.user}
                      variant="outline"
                      className="hover:bg-blue-50 text-gray-700 border-gray-300"
                      type="button"
                      onClick={() => {
                        setUserEmail(demo.email);
                        setPassword(demo.pass);
                      }}
                    >
                      {demo.user}
                    </Button>
                  ))}
                </div>
              </div> */}
            </div>
          </form>

          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
