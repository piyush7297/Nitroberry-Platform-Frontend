"use client";

import React, { memo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Loader } from "lucide-react";

interface PasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const PasswordComponentTab = () => {
  const [loading, setLoading] = useState(false);

  const changePassword = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.CHANGE_PROFILE_PASS}`,
  );

  const formik = useFormik<PasswordFormValues>({
    initialValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      oldPassword: Yup.string().required("Current password is required"),
      newPassword: Yup.string().required("New password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword"), ""], "Passwords must match")
        .required("Confirm password is required"),
    }),
    onSubmit: (values) => {
      const payload = {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      };
      setLoading(true);
      changePassword.mutate(payload, {
        onSuccess: (res) => {
          setLoading(false);
          formik.resetForm();
        },
        onError: (err: any) => {
          setLoading(false);
        },
      });
    },
  });

  return (
    <section className="w-full space-y-5">
      {/* Header */}
      <div className="border-b border-gray-200">
        <h1 className="text-xl font-semibold">Password</h1>
        <p className="text-gray-600 text-sm font-normal mb-4">
          Please enter your current password to change your password.
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-5">
        {/* Current Password */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <Label
            htmlFor="oldPassword"
            className="text-sm font-medium text-gray-700 md:col-span-1"
          >
            Current password
          </Label>
          <div>
            <Input
              id="oldPassword"
              name="oldPassword"
              type="password"
              placeholder="**********"
              className="md:col-span-2 w-full"
              value={formik.values.oldPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.oldPassword && formik.errors.oldPassword && (
              <p className="text-red-600 text-xs mt-1">
                {formik.errors.oldPassword}
              </p>
            )}
          </div>
        </div>

        {/* New Password */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <Label
            htmlFor="newPassword"
            className="text-sm font-medium text-gray-700 md:col-span-1"
          >
            New password
          </Label>
          <div>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="**********"
              className="md:col-span-2 w-full"
              value={formik.values.newPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.newPassword && formik.errors.newPassword && (
              <p className="text-red-600 text-xs mt-1">
                {formik.errors.newPassword}
              </p>
            )}
          </div>
        </div>

        {/* Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <Label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-gray-700 md:col-span-1"
          >
            Confirm new password
          </Label>
          <div>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="**********"
              className="md:col-span-2 w-full"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.confirmPassword &&
              formik.errors.confirmPassword && (
                <p className="text-red-600 text-xs mt-1">
                  {formik.errors.confirmPassword}
                </p>
              )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => formik.resetForm()}
          >
            Cancel
          </Button>
          <Button disabled={loading} type="submit">
            {" "}
            {loading && <Loader className="animate-spin w-5 h-5" />}Update
            password
          </Button>
        </div>
      </form>
    </section>
  );
};

export const PasswordTab = memo(PasswordComponentTab);
