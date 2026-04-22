"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormikProps } from "formik";
import { RoleLabels, Roles } from "@/lib/enums/routes.enum";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { SearchableUserDropdown } from "../components/searchable-user-dropdown";

interface Props {
  formik: FormikProps<any>;
  user?: any;
  jobtitles?: any;
  departments?: any;
  managerOptions?: Array<{
    userId: string;
    hierarchyId: string;
    name: string;
    title: string;
  }>;
  excludeUserId?: string;
  layout?: "default" | "drawer";
}

const EditUserForm: React.FC<Props> = ({
  formik,
  user,
  jobtitles,
  departments,
  managerOptions = [],
  excludeUserId,
  layout = "default",
}) => {
  const _jobTitles =
    jobtitles?.data?.JobTitles ||
    jobtitles?.data?.jobTitles ||
    [];
  const _departments =
    departments?.data?.departments ||
    departments?.data?.Departments ||
    [];
  const { data: rolesData } = useApiQuery(
    ["ROLES_edit_profile"],
    `${API_ENDPOINTS.ROLES}?start=1&limit=1000`,
  );
  const roles = rolesData?.data?.Roles || rolesData?.data?.roles || [];
  const { data: locationData } = useApiQuery(
    ["COMPANY_LOCATION_Edit_user"],
    `${API_ENDPOINTS.COMPANY_LOCATION}?start=1&limit=1000`,
  );
  const locations = locationData?.data?.locations || locationData?.data || [];

  const toSelectValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const currentManagerId = toSelectValue(formik.values.managerId);
  const selectedManagerLabel =
    managerOptions.find((manager) => {
      return (
        manager.userId === currentManagerId ||
        manager.hierarchyId === currentManagerId
      );
    })?.name || "";
  const blockedManagerIds = [toSelectValue(excludeUserId || user?.id)].filter(Boolean);

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
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="Enter last name"
              value={formik.values.lastName || ""}
              onChange={formik.handleChange}
            />
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
              value={formik.values.email || user?.email || ""}
              onChange={formik.handleChange}
              disabled
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="roleId">Access Profile*</Label>
            <Select
              value={toSelectValue(formik.values.roleId)}
              onValueChange={(val) => {
                formik.setFieldValue("roleId", val);
              }}
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
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="departmentId">Department</Label>
            <Select
              name="departmentId"
              value={toSelectValue(formik.values.departmentId)}
              onValueChange={(value) =>
                formik.setFieldValue("departmentId", value)
              }
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
          </div>
        </div>

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
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="jobTitleId">Job Title</Label>
            <Select
              name="jobTitleId"
              value={toSelectValue(formik.values.jobTitleId)}
              onValueChange={(value) =>
                formik.setFieldValue("jobTitleId", value)
              }
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
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="managerId">Reports To</Label>
            <SearchableUserDropdown
              value={currentManagerId}
              onValueChange={(value) => formik.setFieldValue("managerId", value)}
              placeholder="Select reporting manager"
              emptyOptionLabel="No Manager"
              selectedLabel={selectedManagerLabel}
              excludeUserIds={blockedManagerIds}
              queryKey="EDIT_USER_MANAGER_SEARCH"
            />
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
        <div className="flex flex-col space-y-2">
          <Label htmlFor="firstName">First Name*</Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Enter first name"
            value={formik.values.firstName || ""}
            onChange={formik.handleChange}
          />
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Enter last name"
            value={formik.values.lastName || ""}
            onChange={formik.handleChange}
          />
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col space-y-2">
        <Label htmlFor="email">Email*</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter email"
          value={formik.values.email || user?.email || ""}
          onChange={formik.handleChange}
          disabled
        />
      </div>

      {/* Password Policy */}
      <div className="flex flex-col space-y-2">
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
      </div>

      {/* Role */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="roleId">Access Profile*</Label>
        <Select
          value={toSelectValue(formik.values.roleId)}
          onValueChange={(val) => {
            formik.setFieldValue("roleId", val);
          }}
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
      </div>

      <div className="flex flex-col space-y-1">
        <Label htmlFor="locationId">Location*</Label>
        <Select
          value={toSelectValue(formik.values.locationId)} // "" triggers placeholder
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
      </div>

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
      </div>

      <div className="flex flex-col space-y-1">
        <Label htmlFor="managerId">Reports To</Label>
        <SearchableUserDropdown
          value={currentManagerId}
          onValueChange={(value) => formik.setFieldValue("managerId", value)}
          placeholder="Select reporting manager"
          emptyOptionLabel="No Manager"
          selectedLabel={selectedManagerLabel}
          excludeUserIds={blockedManagerIds}
          queryKey="EDIT_USER_MANAGER_SEARCH"
        />
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
      </div>

      {/* Active User */}
      <div className="flex items-center space-x-2 pt-2">
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
};

export default EditUserForm;
