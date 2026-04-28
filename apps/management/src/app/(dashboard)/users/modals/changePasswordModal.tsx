"use client";

import React from "react";
import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { FormikProps } from "formik";

interface Props {
  user: any;
  formik: FormikProps<any>;
}

const ChangePasswordForm: React.FC<Props> = ({ user, formik }) => {
  const renderError = (field: string) => {
    const error = formik.errors[field];
    const touched = formik.touched[field];

    if (!touched || !error) return null;

    // if error is string, show it
    if (typeof error === "string")
      return <p className="text-red-500 text-xs">{error}</p>;

    // if error is an array (like nested array validation), join into a string
    if (Array.isArray(error))
      return <p className="text-red-500 text-xs">{error.join(", ")}</p>;

    // if error is an object (like nested object validation), stringify it safely
    if (typeof error === "object")
      return <p className="text-red-500 text-xs">{JSON.stringify(error)}</p>;

    return null;
  };
  return (
    <div className="flex flex-col space-y-2">
      <Label htmlFor="password">New Password</Label>
      <Input
        id="password1"
        name="password"
        placeholder="New Password"
        type="password"
        autoComplete="new-password"
        value={formik.values.password || ""}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
      {renderError("password")}
      <Label htmlFor="confirmPassword">Confirm Password</Label>
      <Input
        id="confirmPassword"
        name="confirmPassword"
        placeholder="Confirm Password"
        type="password"
        autoComplete="confirm-password"
        value={formik.values.confirmPassword || ""}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
      {renderError("confirmPassword")}
    </div>
  );
};

export default ChangePasswordForm;
