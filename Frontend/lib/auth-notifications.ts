"use client";

import { toast } from "sonner";

export interface AuthNotificationOptions {
  duration?: number;
  description?: string;
}

export class AuthNotifications {
  // Success notifications
  static loginSuccess(userName: string, options?: AuthNotificationOptions) {
    toast.success(`Welcome back, ${userName}!`, {
      description: options?.description || "Login successful",
      duration: options?.duration || 2000,
    });
  }

  static registerSuccess(userName: string, options?: AuthNotificationOptions) {
    toast.success(`Welcome ${userName}!`, {
      description: options?.description || "Registration successful. You are now logged in.",
      duration: options?.duration || 2000,
    });
  }

  static logoutSuccess(options?: AuthNotificationOptions) {
    toast.success("Logged out successfully", {
      description: options?.description || "You have been logged out of your account",
      duration: options?.duration || 2000,
    });
  }

  static passwordResetSuccess(options?: AuthNotificationOptions) {
    toast.success("Password reset successful", {
      description: options?.description || "Your password has been updated",
      duration: options?.duration || 3000,
    });
  }

  static emailVerificationSuccess(options?: AuthNotificationOptions) {
    toast.success("Email verified successfully", {
      description: options?.description || "Your email address has been verified",
      duration: options?.duration || 3000,
    });
  }

  // Error notifications
  static loginError(errorMessage: string, options?: AuthNotificationOptions) {
    toast.error("Login Failed", {
      description: options?.description || errorMessage,
      duration: options?.duration || 4000,
    });
  }

  static registerError(errorMessage: string, options?: AuthNotificationOptions) {
    toast.error("Registration Failed", {
      description: options?.description || errorMessage,
      duration: options?.duration || 4000,
    });
  }

  static connectionError(errorMessage: string, options?: AuthNotificationOptions) {
    toast.error("Connection Error", {
      description: options?.description || errorMessage,
      duration: options?.duration || 4000,
    });
  }

  static validationError(errorMessage: string, options?: AuthNotificationOptions) {
    toast.error("Validation Error", {
      description: options?.description || errorMessage,
      duration: options?.duration || 4000,
    });
  }

  static sessionExpired(options?: AuthNotificationOptions) {
    toast.error("Session Expired", {
      description: options?.description || "Please log in again to continue",
      duration: options?.duration || 5000,
    });
  }

  static unauthorizedAccess(options?: AuthNotificationOptions) {
    toast.error("Access Denied", {
      description: options?.description || "You don't have permission to access this resource",
      duration: options?.duration || 4000,
    });
  }

  // Warning notifications
  static passwordWeak(options?: AuthNotificationOptions) {
    toast.error("Weak Password", {
      description: options?.description || "Password is too weak. Please use a stronger password.",
      duration: options?.duration || 4000,
    });
  }

  static passwordMismatch(options?: AuthNotificationOptions) {
    toast.error("Password Mismatch", {
      description: options?.description || "Passwords do not match.",
      duration: options?.duration || 4000,
    });
  }

  static missingFields(options?: AuthNotificationOptions) {
    toast.error("Missing Information", {
      description: options?.description || "Please fill in all required fields.",
      duration: options?.duration || 4000,
    });
  }

  static invalidEmail(options?: AuthNotificationOptions) {
    toast.error("Invalid Email", {
      description: options?.description || "Please enter a valid email address.",
      duration: options?.duration || 4000,
    });
  }

  static sessionWarning(timeLeft: number, options?: AuthNotificationOptions) {
    toast.warning("Session Expiring Soon", {
      description: options?.description || `Your session will expire in ${timeLeft} minutes. Please save your work.`,
      duration: options?.duration || 6000,
    });
  }

  // Info notifications
  static passwordResetSent(email: string, options?: AuthNotificationOptions) {
    toast.info("Password Reset Email Sent", {
      description: options?.description || `Password reset instructions have been sent to ${email}`,
      duration: options?.duration || 5000,
    });
  }

  static verificationEmailSent(email: string, options?: AuthNotificationOptions) {
    toast.info("Verification Email Sent", {
      description: options?.description || `Verification email has been sent to ${email}`,
      duration: options?.duration || 5000,
    });
  }

  static accountLocked(options?: AuthNotificationOptions) {
    toast.warning("Account Temporarily Locked", {
      description: options?.description || "Too many failed login attempts. Please try again later.",
      duration: options?.duration || 6000,
    });
  }

  // Custom notification for any auth-related message
  static custom(type: "success" | "error" | "warning" | "info", title: string, description?: string, duration?: number) {
    toast[type](title, {
      description,
      duration: duration || 3000,
    });
  }
}