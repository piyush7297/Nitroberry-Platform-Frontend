"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Checkbox } from "./ui/checkbox";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useFormik, FormikProps } from "formik";
import * as Yup from "yup";
import ClientInstance from "@/shared/client";

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  username: Yup.string().required("Username is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formik: FormikProps<any> = useFormik({
    initialValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      terms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("username", values.username);
        formData.append("email", values.email);
        formData.append("password", values.password);

        const res: any = await ClientInstance.Auth.Signup(formData);
        setLoading(false);

        if (res.success) {
          toast({
            title: "Success!",
            description:
              "Account created! Please check your email for verification.",
            variant: "default",
          });
          setTimeout(() => router.push("/login"), 1500);
        } else {
          const data = await res.json();
          if (data.errors) {
            Object.entries(data.errors).forEach(([field, message]: any) => {
              formik.setFieldError(field, message as string);
            });
          }
          toast({
            title: "Registration failed",
            description: data.message || "Something went wrong",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        setLoading(false);
        toast({
          title: "Registration failed",
          description: err?.response?.data?.message || "Something went wrong",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            onSubmit={formik.handleSubmit}
            className="p-6 md:p-8 flex flex-col gap-6"
          >
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Register!</h1>
              <p className="text-muted-foreground text-balance">
                Create your enterprise Workflow account
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                name="terms"
                checked={formik.values.terms}
                onCheckedChange={(checked: boolean) =>
                  formik.setFieldValue("terms", checked)
                }
                className="cursor-pointer"
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-none *:[a]:hover:text-primary *:[a]:underline *:[a]:underline-offset-4"
              >
                I agree to the <Link href="#">Terms</Link> and{" "}
                <Link href="#">Privacy</Link>.
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Sign in
              </Link>
            </div>
          </form>

          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/placeholder.svg"
              alt="Illustration"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
