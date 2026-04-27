"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import React from "react";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  icon?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  icon,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto overflow-y-auto pt-16 sm:w-[90vw] md:w-[80vw] lg:max-w-md max-h-[90vh]">
        {/* Decorative background */}
        <div
          className="absolute pointer-events-none w-[220px] h-[220px] bg-center bg-cover top-0 left-[25%] -translate-x-1/2 -z-10"
          style={{ backgroundImage: "url('/images/bg-decorative.svg')" }}
        />

        {/* Icon section */}
        <div className="absolute top-6 left-6 w-12 h-12 flex items-center justify-center rounded-lg border border-gray-200 shadow-sm">
          {icon || <CheckCircle2 className="w-6 h-6 text-green-500" />}
        </div>

        {/* Title + Description */}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Buttons */}
        <DialogFooter className="w-full">
          <div className="flex justify-between w-full gap-4">
            <Button
              variant="outline"
              onClick={onCancel || onClose}
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button variant="default" onClick={onConfirm} className="flex-1">
              {confirmText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ConfirmationModal;
