"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { FormikProps } from "formik";

interface Props {
  user: any; // could be User or Group
  formik: FormikProps<any>;
}

const DeleteUserForm: React.FC<Props> = ({ user, formik }) => {
  const isUser = !!user.email; // users have email
  const isGroup = !!user.groups; // groups have 'groups' field

  const label = isUser ? "Type the email" : "Type the group name";
  const valueKey = isUser ? "email" : "groups"; // fix: API uses 'groups'
  const placeholder = isUser ? "Confirm Email" : "Confirm Group Name";

  return (
    <div>
      <p className="mb-2">
        {label} <strong>{user[valueKey]}</strong> to confirm
      </p>
      <Input
        id="confirmValue"
        name="confirmValue"
        placeholder={placeholder}
        value={formik.values.confirmValue || ""}
        onChange={formik.handleChange}
      />
    </div>
  );
};

export default DeleteUserForm;
