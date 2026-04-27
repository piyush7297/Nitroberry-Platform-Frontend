"use client";

import { FC, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader } from "lucide-react";

interface ConfirmationModalProps {
  open: boolean;
  title?: string;
  description?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  open,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onCancel,
  onConfirm,
  loading,
}) => {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-gray-600">{description}</p>}
        <DialogFooter className="mt-1 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {loading && <Loader className="animate-spin w-5 h-5" />}{" "}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
