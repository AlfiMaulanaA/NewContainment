// lib/avatar-utils.ts

/**
 * Get theme-aware default avatar path
 * @param isDark - Whether current theme is dark mode
 * @returns Path to appropriate default avatar
 */
export function getDefaultAvatarPath(isDark: boolean = false): string {
  return isDark ? "/images/avatar-user-dark.png" : "/images/avatar-user.png";
}

/**
 * Check if a path is the default avatar (either light or dark)
 * @param path - Avatar path to check
 * @returns Whether the path is a default avatar
 */
export function isDefaultAvatar(path?: string | null): boolean {
  if (!path) return true;
  return path === "/images/avatar-user.png" || path === "/images/avatar-user-dark.png";
}

/**
 * Get theme-aware avatar URL with fallback to default
 * @param user - User object with photoPath
 * @param isDark - Whether current theme is dark mode
 * @param baseUrl - API base URL for custom photos
 * @returns Complete avatar URL
 */
export function getThemeAvatarUrl(
  user: { photoPath?: string | null }, 
  isDark: boolean = false, 
  baseUrl: string = ""
): string {
  // If user has custom photo and it's not the default avatar
  if (user.photoPath && !isDefaultAvatar(user.photoPath)) {
    return `${baseUrl}${user.photoPath}`;
  }
  
  // Return theme-appropriate default avatar
  return getDefaultAvatarPath(isDark);
}

/**
 * Get environment variable for avatar URL with theme support
 * @param isDark - Whether current theme is dark mode
 * @returns Avatar URL from environment or default
 */
export function getEnvAvatarUrl(isDark: boolean = false): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_AVATAR_URL;
  
  // If environment variable is set and it's not the default, use it
  if (envUrl && !isDefaultAvatar(envUrl)) {
    return envUrl;
  }
  
  // Otherwise return theme-appropriate default
  return getDefaultAvatarPath(isDark);
}