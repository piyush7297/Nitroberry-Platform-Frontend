"use client";

import React, { JSX } from "react";
import { Button } from "@nitroberry/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@nitroberry/ui";
import {
  Edit3,
  Filter,
  Loader,
  Lock,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  footerButtons?: {
    cancel?: string;
    submit?: string;
    submitVariant?: "default" | "outline" | "destructive" | "secondary";
  };
  onSubmit?: () => void;
  children: React.ReactNode;
  activeModal?: any;
  loading?: boolean;
  isConfirmed?: boolean;
  isDeleteAction?: boolean;
}
interface ModalConfig {
  title: string;
  description?: string;
  icon: JSX.Element;
}

const modalMeta: Record<string, ModalConfig> = {
  createGroup: {
    title: "Create User Group",
    description: "Update the user’s information to create group.",
    icon: <Users className="w-5 h-5" />,
  },
  editGroup: {
    title: "Edit User Group",
    description: "Modify the group name, description, or members as needed.",
    icon: <Users className="w-5 h-5" />,
  },
  createUser: {
    title: "Add New User",
    description: "Fill in the details below to create a new user account.",
    icon: <UserPlus className="w-5 h-5" />,
  },
  editUser: {
    title: "Edit User Details",
    description: "Edit user information or update their role.",
    icon: <Edit3 className="w-5 h-5" />,
  },
  deleteUser: {
    title: "Delete User",
    description:
      "Are you sure you want to delete this user? This action cannot be undone.",
    icon: <Trash2 className="w-5 h-5" />,
  },
  deleteGroup: {
    title: "Delete Group",
    description:
      "Are you sure you want to delete this group? This action cannot be undone.",
    icon: <Trash2 className="w-5 h-5" />,
  },
  changePassword: {
    title: "Change Password",
    description: "Set a new password for the user.",
    icon: <Lock className="w-5 h-5" />,
  },
  filters: {
    title: "Filters",
    description: "Apply filters to narrow down the user list.",
    icon: <Filter className="w-5 h-5" />,
  },
};
const BaseModal: React.FC<BaseModalProps> = ({
  activeModal,
  open,
  onClose,
  footerButtons,
  onSubmit,
  children,
  loading,
  isConfirmed,
  isDeleteAction,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="mx-auto w-full max-w-2xl overflow-y-auto pt-16  max-h-[90vh]">
        <div
          className="absolute pointer-events-none w-[220px] h-[220px] bg-center bg-cover top-0 left-[20%] -translate-x-1/2 -z-10"
          style={{ backgroundImage: "url('/images/bg-decorative.svg')" }}
        />
        <div className="absolute top-6.5 left-3 w-12 h-12 flex items-center justify-center rounded-lg border border-gray-200 shadow-sm sm:top-4 sm:left-3 sm:w-10 sm:h-10 md:top-6.5 md:left-4 md:w-12 md:h-12">
          {activeModal?.type && modalMeta[activeModal.type].icon}
        </div>
        <DialogHeader>
          <DialogTitle>
            {activeModal?.type && modalMeta[activeModal.type].title}
          </DialogTitle>
          {activeModal?.type && modalMeta[activeModal.type].description && (
            <DialogDescription>
              {modalMeta[activeModal.type].description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="my-4">{children}</div>

        <DialogFooter className="flex justify-end gap-2">
          {footerButtons?.cancel && (
            <Button variant="outline" onClick={onClose}>
              {footerButtons.cancel}
            </Button>
          )}
          {footerButtons?.submit && (
            <Button
              variant={footerButtons.submitVariant || "default"}
              onClick={onSubmit}
              disabled={loading || (isDeleteAction && !isConfirmed)}
              className="flex items-center justify-center"
            >
              {loading && <Loader className="animate-spin w-5 h-5" />}
              <span>{footerButtons.submit}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BaseModal;
