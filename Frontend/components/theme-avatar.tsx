"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getThemeAvatarUrl, getEnvAvatarUrl } from "@/lib/avatar-utils";

interface ThemeAvatarProps {
  user?: { photoPath?: string | null };
  baseUrl?: string;
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onError?: () => void;
  fallbackToEnv?: boolean;
}

/**
 * Theme-aware Avatar component that automatically switches between 
 * light and dark default avatars based on current theme
 */
export default function ThemeAvatar({
  user,
  baseUrl = "",
  className = "",
  alt = "User Avatar",
  width = 40,
  height = 40,
  priority = false,
  onError,
  fallbackToEnv = false,
}: ThemeAvatarProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isDark = resolvedTheme === "dark";
    
    if (fallbackToEnv) {
      // Use environment avatar URL with theme support
      setImageSrc(getEnvAvatarUrl(isDark));
    } else if (user) {
      // Use user-specific avatar with theme support
      setImageSrc(getThemeAvatarUrl(user, isDark, baseUrl));
    } else {
      // Use default theme-appropriate avatar
      setImageSrc(getThemeAvatarUrl({}, isDark, baseUrl));
    }
  }, [mounted, resolvedTheme, user, baseUrl, fallbackToEnv]);

  const handleError = () => {
    // Fallback to default avatar for current theme
    const isDark = resolvedTheme === "dark";
    setImageSrc(getThemeAvatarUrl({}, isDark));
    
    if (onError) {
      onError();
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !imageSrc) {
    return (
      <div 
        className={`bg-muted animate-pulse rounded-full ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={`rounded-full ${className}`}
      priority={priority}
      onError={handleError}
    />
  );
}

/**
 * Simple hook to get theme-aware avatar URL
 * @param user - User object with photoPath
 * @param baseUrl - API base URL for custom photos
 * @returns Theme-appropriate avatar URL
 */
export function useThemeAvatar(
  user?: { photoPath?: string | null }, 
  baseUrl: string = ""
): string {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return "/images/avatar-user.png"; // Default fallback during SSR
  }

  const isDark = resolvedTheme === "dark";
  return getThemeAvatarUrl(user || {}, isDark, baseUrl);
}