"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { Textarea } from "@nitroberry/ui";
import { UserSearch } from "@/components/user-search";
interface User {
  id: string;
  firstName: string;
  email: string;
  roleName: string;
}

interface Props {
  formik: any;
  isEdit?: boolean;
  activeModal?: any;
}

const CreateGroupForm: React.FC<Props> = ({
  formik,
  isEdit = false,
  activeModal,
}) => {
  const [search, setSearch] = useState<string>("");
  const [allSelectedUsers, setAllSelectedUsers] = useState<User[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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

  // Populate initial members in edit mode
  useEffect(() => {
    if (!isEdit) return;

    if (
      activeModal?.user?.groupUsers &&
      (!formik.values.userIds || formik.values.userIds.length === 0)
    ) {
      const initialMembers = activeModal.user.groupUsers.map((user: any) => ({
        id: user.id,
        isDeleted: false,
        firstName: user.firstName,
        lastName: user.lastName,
      }));
      setAllSelectedUsers((prev) => [...prev, ...activeModal.user.groupUsers]);
      formik.setFieldValue("userIds", initialMembers);
    }
  }, [isEdit, activeModal]);

  const addMember = (member: User) => {
    if (isEdit) {
      formik.setFieldValue("userIds", [
        ...(formik.values.userIds || []),
        { id: member.id, isDeleted: false },
      ]);
    } else {
      formik.setFieldValue("userIds", [
        ...(formik.values.userIds || []),
        member.id,
      ]);
    }
    // Keep full info in allSelectedUsers
    setAllSelectedUsers((prev) => {
      if (prev.some((u) => u.id === member.id)) return prev;
      return [...prev, member];
    });
    setSearch("");
  };

  // Remove member
  const removeMember = (id: string) => {
    if (isEdit) {
      formik.setFieldValue(
        "userIds",
        (formik.values.userIds || []).map((u: any) =>
          u.id === id ? { ...u, isDeleted: true } : u,
        ),
      );
    } else {
      formik.setFieldValue(
        "userIds",
        (formik.values.userIds || []).filter((uid: any) => uid !== id),
      );
    }
    setAllSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Selected members to display
  const selectedMembers = allSelectedUsers.filter((member) => {
    if (isEdit) {
      // userIds is array of {id, isDeleted}
      const found = (allSelectedUsers || []).find(
        (u: any) => u?.id === member?.id,
      );
      return Boolean(found);
    } else {
      // userIds is array of id
      return (formik.values.userIds || []).includes(member.id);
    }
  });

  return (
    <div className="space-y-4">
      {/* Group Name */}
      <div className="flex flex-col space-y-2">
        <Label htmlFor="groupName">Group Name*</Label>
        <Input
          id="groupName"
          name="name"
          placeholder="Enter group name"
          value={formik.values.name || ""}
          onChange={formik.handleChange}
        />
        {renderError("name")}
      </div>

      {/* Description */}
      <div className="flex flex-col space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Enter group description"
          value={formik.values.description || ""}
          onChange={formik.handleChange}
          rows={4}
        />
        {renderError("description")}
      </div>

      {/* Search Members */}
      <div className="flex flex-col space-y-2 relative">
        <UserSearch
          marginTop="mt-3"
          search={search}
          setSearch={setSearch}
          selectedUserIds={selectedMembers.map((member) => member.id)}
          onSelect={(user: any) => addMember(user)}
          isFocused={showUserDropdown}
          setIsFocused={setShowUserDropdown}
          showDropdown={showUserDropdown}
          setShowDropdown={setShowUserDropdown}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setShowUserDropdown(true)}
          onBlur={() => setShowUserDropdown(false)}
          label="Search Members"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center bg-primary/80 text-black rounded-full px-3 py-1 text-sm"
            >
              {member.firstName}
              <button
                type="button"
                className="ml-2 text-black hover:black cursor-pointer"
                onClick={() => removeMember(member.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreateGroupForm;
