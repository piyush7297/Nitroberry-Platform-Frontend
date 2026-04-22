"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FormikProps } from "formik";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { SearchableUserDropdown } from "../components/searchable-user-dropdown";

interface Props {
  formik: FormikProps<any>;
  departments?: any;
  jobtitles?: any;
  holidayListData?: any;
  managerOptions?: Array<{
    userId: string;
    hierarchyId: string;
    name: string;
    title: string;
  }>;
  layout?: "default" | "drawer";
}

const CreateUserForm: React.FC<Props> = ({
  formik,
  jobtitles,
  departments,
  holidayListData,
  managerOptions = [],
  layout = "default",
}) => {
  let _jobTitles = jobtitles?.data?.JobTitles || jobtitles?.data?.jobTitles || [];
  let _departments = departments?.data?.departments || departments?.data?.Departments || [];
  let _holidayList = holidayListData?.data?.managedHolidays || [];

  const { data: rolesData } = useApiQuery(
    ["ROLES_CREATE_USER"],
    `${API_ENDPOINTS.ROLES}?start=1&limit=1000`,
  );
  const { data: locationData } = useApiQuery(
    ["COMPANY_LOCATION_create_user"],
    `${API_ENDPOINTS.COMPANY_LOCATION}?start=1&limit=1000`,
  );
  const roles = rolesData?.data?.Roles || rolesData?.data?.roles || [];
  const locations = locationData?.data?.locations || locationData?.data || [];

  const toSelectValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const selectedManagerLabel =
    managerOptions.find((manager) => {
      const currentManagerId = toSelectValue(formik.values.managerId);
      return (
        manager.userId === currentManagerId ||
        manager.hierarchyId === currentManagerId
      );
    })?.name || "";

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

  if (layout === "drawer") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="firstName">First Name*</Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="Enter first name"
              value={formik.values.firstName || ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {renderError("firstName")}
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="Enter last name"
              value={formik.values.lastName || ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {renderError("lastName")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="email">Email*</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              value={formik.values.email || ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {renderError("email")}
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="roleId">Access Profile*</Label>
            <Select
              value={toSelectValue(formik.values.roleId)}
              onValueChange={(val) => formik.setFieldValue("roleId", val)}
            >
              <SelectTrigger id="roleId" className="w-full">
                <SelectValue placeholder="Select Access Profile" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role: any) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderError("roleId")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="password">Password*</Label>
            <Input
              id="password09"
              name="password"
              type="password"
              placeholder="Enter password"
              autoComplete="new-password"
              value={formik.values.password || ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {renderError("password")}
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="policyType">Password Expiry Policy*</Label>
            <Select
              value={
                formik.values.policyType !== null
                  ? String(formik.values.policyType)
                  : ""
              }
              onValueChange={(val) =>
                formik.setFieldValue("policyType", Number(val))
              }
            >
              <SelectTrigger id="policyType" className="w-full">
                <SelectValue placeholder="Select password policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Custom Expiry</SelectItem>
                <SelectItem value="2">Never Expire</SelectItem>
                <SelectItem value="3">Force Change Every 30 Days</SelectItem>
              </SelectContent>
            </Select>
            {renderError("policyType")}
          </div>
        </div>

        {formik.values.policyType === 1 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="customExpireDays">Custom Expiry Days</Label>
              <Input
                id="customExpireDays"
                name="customExpireDays"
                type="number"
                placeholder="Enter number of days"
                value={formik.values.customExpireDays ?? ""}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {renderError("customExpireDays")}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="locationId">Location*</Label>
            <Select
              value={toSelectValue(formik.values.locationId)}
              onValueChange={(val) => formik.setFieldValue("locationId", val)}
            >
              <SelectTrigger id="locationId" className="w-full">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location: any) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.title || location.name || "-"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderError("locationId")}
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="departmentId">Department</Label>
            <Select
              name="departmentId"
              value={toSelectValue(formik.values.departmentId)}
              onValueChange={(value) => formik.setFieldValue("departmentId", value)}
            >
              <SelectTrigger id="departmentId" className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {_departments?.map((dept: any) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderError("departmentId")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="jobTitleId">Job Title</Label>
            <Select
              name="jobTitleId"
              value={toSelectValue(formik.values.jobTitleId)}
              onValueChange={(value) => formik.setFieldValue("jobTitleId", value)}
            >
              <SelectTrigger id="jobTitleId" className="w-full">
                <SelectValue placeholder="Select job title" />
              </SelectTrigger>
              <SelectContent>
                {_jobTitles?.map((job: any) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderError("jobTitleId")}
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="managerId">Reports To</Label>
            <SearchableUserDropdown
              value={toSelectValue(formik.values.managerId)}
              onValueChange={(value) => formik.setFieldValue("managerId", value)}
              placeholder="Select reporting manager"
              emptyOptionLabel="No Manager"
              selectedLabel={selectedManagerLabel}
              queryKey="CREATE_USER_MANAGER_SEARCH"
            />
            {renderError("managerId")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="linkedIn">LinkedIn Profile</Label>
            <Input
              id="linkedIn"
              name="linkedIn"
              placeholder="Enter LinkedIn URL"
              value={formik.values.profileLinks?.[0]?.linkedIn || ""}
              onChange={(e) =>
                formik.setFieldValue("profileLinks", [
                  {
                    ...(formik.values.profileLinks?.[0] || {}),
                    linkedIn: e.target.value,
                  },
                ])
              }
              onBlur={formik.handleBlur}
            />
            {renderError("linkedIn")}
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="calenderLink">Calendar Link</Label>
            <Input
              id="calenderLink"
              name="calenderLink"
              placeholder="Enter calendar link"
              value={formik.values.profileLinks?.[0]?.calenderLink || ""}
              onChange={(e) =>
                formik.setFieldValue("profileLinks", [
                  {
                    ...(formik.values.profileLinks?.[0] || {}),
                    calenderLink: e.target.value,
                  },
                ])
              }
              onBlur={formik.handleBlur}
            />
            {renderError("calenderLink")}
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="isActive"
            checked={!!formik.values.isActive}
            onCheckedChange={(checked) =>
              formik.setFieldValue("isActive", !!checked)
            }
          />
          <Label htmlFor="isActive">Active User</Label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col space-y-1">
          <Label htmlFor="firstName">First Name*</Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Enter first name"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          {renderError("firstName")}
        </div>

        <div className="flex flex-col space-y-1">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Enter last name"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          {renderError("lastName")}
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="email">Email*</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {renderError("email")}
      </div>

      {/* Password */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="password">Password*</Label>
        <Input
          id="password09"
          name="password"
          type="password"
          placeholder="Enter password"
          autoComplete="new-password"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {renderError("password")}
      </div>

      {/* Role */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="roleId">Access Profile*</Label>
        <Select
          value={toSelectValue(formik.values.roleId)}
          onValueChange={(val) => formik.setFieldValue("roleId", val)}
        >
          <SelectTrigger id="roleId" className="w-full">
            <SelectValue placeholder="Select Access Profile" />{" "}
            {/* placeholder will show when value="" */}
          </SelectTrigger>
          <SelectContent>
            {roles.map((role: any) => (
              <SelectItem key={role.id} value={String(role.id)}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {renderError("roleId")}
      </div>

      {/* Holiday Scope */}
      {/* <div className="flex flex-col space-y-1">
        <Label htmlFor="holidayScopeId">Select Holiday Scope</Label>
        <Select
          value={formik.values.holidayScopeId !== null ? (formik.values.holidayScopeId) : ""} 
          onValueChange={(val) => formik.setFieldValue("holidayScopeId", (val))}
        >
          <SelectTrigger id="holidayScopeId" className="w-full">
            <SelectValue placeholder="Select Holiday Scope" />
          </SelectTrigger>
          <SelectContent>
            {_holidayList.map((holiday: any) => (
                <SelectItem key={holiday.id} value={holiday.id}>
                  {holiday.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {renderError("holidayScopeId")}
      </div> */}

      <div className="flex flex-col space-y-1">
        <Label htmlFor="locationId">Location*</Label>
        <Select
          value={toSelectValue(formik.values.locationId)}
          onValueChange={(val) => formik.setFieldValue("locationId", val)}
        >
          <SelectTrigger id="locationId" className="w-full">
            <SelectValue placeholder="Select Location" />{" "}
            {/* placeholder will show when value="" */}
          </SelectTrigger>
          <SelectContent>
            {locations.map((location: any) => (
              <SelectItem key={location.id} value={String(location.id)}>
                {location.title || location.name || "-"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {renderError("locationId")}
      </div>

      {/* Password Policy */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="policyType">Password Expiry Policy*</Label>
        <Select
          value={
            formik.values.policyType !== null
              ? String(formik.values.policyType)
              : ""
          } // "" triggers placeholder
          onValueChange={(val) =>
            formik.setFieldValue("policyType", Number(val))
          } // store as number
        >
          <SelectTrigger id="policyType" className="w-full">
            <SelectValue placeholder="Select password policy" />{" "}
            {/* placeholder shows when value="" */}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Custom Expiry</SelectItem>
            <SelectItem value="2">Never Expire</SelectItem>
            <SelectItem value="3">Force Change Every 30 Days</SelectItem>
          </SelectContent>
        </Select>
        {renderError("policyType")}
      </div>

      {/* Custom Expiry Days */}
      {formik.values.policyType === 1 && (
        <div className="flex flex-col space-y-1">
          <Label htmlFor="customExpireDays">Custom Expiry Days</Label>
          <Input
            id="customExpireDays"
            name="customExpireDays"
            type="number"
            placeholder="Enter number of days"
            value={formik.values.customExpireDays}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          {renderError("customExpireDays")}
        </div>
      )}

      {/* Job Title */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="jobTitleId">Job Title</Label>
        <Select
          name="jobTitleId"
          value={toSelectValue(formik.values.jobTitleId)}
          onValueChange={(value) => formik.setFieldValue("jobTitleId", value)}
        >
          <SelectTrigger id="jobTitleId" className="w-full">
            <SelectValue placeholder="Select job title" />
          </SelectTrigger>
          <SelectContent>
            {_jobTitles?.map((job: any) => (
              <SelectItem key={job.id} value={String(job.id)}>
                {job.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {renderError("jobTitleId")}
      </div>

      {/* Department */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="departmentId">Department</Label>
        <Select
          name="departmentId"
          value={toSelectValue(formik.values.departmentId)}
          onValueChange={(value) => formik.setFieldValue("departmentId", value)}
        >
          <SelectTrigger id="departmentId" className="w-full">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {_departments?.map((dept: any) => (
              <SelectItem key={dept.id} value={String(dept.id)}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {renderError("departmentId")}
      </div>

      <div className="flex flex-col space-y-1">
        <Label htmlFor="managerId">Reports To</Label>
        <SearchableUserDropdown
          value={toSelectValue(formik.values.managerId)}
          onValueChange={(value) => formik.setFieldValue("managerId", value)}
          placeholder="Select reporting manager"
          emptyOptionLabel="No Manager"
          selectedLabel={selectedManagerLabel}
          queryKey="CREATE_USER_MANAGER_SEARCH"
        />
        {renderError("managerId")}
      </div>

      {/* LinkedIn */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="linkedIn">LinkedIn Profile</Label>
        <Input
          id="linkedIn"
          name="linkedIn"
          placeholder="Enter LinkedIn URL"
          value={formik.values.profileLinks?.[0]?.linkedIn || ""}
          onChange={(e) =>
            formik.setFieldValue("profileLinks", [
              {
                ...(formik.values.profileLinks?.[0] || {}),
                linkedIn: e.target.value,
              },
            ])
          }
          onBlur={formik.handleBlur}
        />
        {renderError("linkedIn")}
      </div>

      {/* Calendar Link */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="calenderLink">Calendar Link</Label>
        <Input
          id="calenderLink"
          name="calenderLink"
          placeholder="Enter calendar link"
          value={formik.values.profileLinks?.[0]?.calenderLink || ""}
          onChange={(e) =>
            formik.setFieldValue("profileLinks", [
              {
                ...(formik.values.profileLinks?.[0] || {}),
                calenderLink: e.target.value,
              },
            ])
          }
          onBlur={formik.handleBlur}
        />
        {renderError("calenderLink")}
      </div>

      {/* Active User */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="isActive"
          checked={formik.values.isActive}
          onCheckedChange={(checked) =>
            formik.setFieldValue("isActive", !!checked)
          }
        />
        <Label htmlFor="isActive">Active User</Label>
      </div>
    </div>
  );
};

export default CreateUserForm;
