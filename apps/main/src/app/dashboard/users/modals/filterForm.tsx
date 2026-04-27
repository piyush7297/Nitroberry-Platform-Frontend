"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";

interface Props {
  formik: any; // Formik instance
  activetab: any;
}

const FilterForm: React.FC<Props> = ({ formik, activetab }) => {
  const { data: rolesData } = useApiQuery(
    ["ROLES_CREATE_USER"],
    `${API_ENDPOINTS.ROLES}?start=1&limit=1000`,
  );
  const roles = rolesData?.data?.Roles || [];
  return (
    <div className="space-y-3">
      {/* Status */}
      <div className="flex flex-col space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formik.values?.filters?.status || ""}
          onValueChange={(val) => formik.setFieldValue("filters.status", val)}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="undefined">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Role */}
      {activetab === "user" && (
        <div className="flex flex-col space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={formik.values?.filters?.role || ""}
            onValueChange={(val) => formik.setFieldValue("filters.role", val)}
          >
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role: any) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
              {/* <SelectItem value="1">Owner</SelectItem>
            <SelectItem value="2">Admin</SelectItem>
            <SelectItem value="3">Manager</SelectItem>
            <SelectItem value="4">User</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Created After */}
      <div className="flex flex-col space-y-2">
        <Label htmlFor="createdAt">Created After</Label>
        <Input
          id="createdAt"
          name="filters.createdAt"
          type="date"
          value={formik.values?.filters?.createdAt || ""}
          onChange={formik.handleChange}
        />
      </div>
    </div>
  );
};

export default FilterForm;
