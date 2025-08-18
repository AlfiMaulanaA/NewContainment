"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { AuthNotifications } from "@/lib/auth-notifications";

interface LogoutConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmation({ isOpen, onClose, onConfirm }: LogoutConfirmationProps) {
  const handleConfirm = () => {
    onConfirm();
    AuthNotifications.logoutSuccess();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to log out? You will need to sign in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}