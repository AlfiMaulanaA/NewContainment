// app/test-auth/page.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentUserFromToken, getTokenTimeRemaining, isTokenExpired, isTokenExpiringSoon } from '@/lib/auth-utils';

export default function TestAuthPage() {
  const { user, logout } = useAuth();
  const [tokenValidation, setTokenValidation] = useState<string>('');

  const handleValidateToken = async () => {
    try {
      const isValid = await authApi.validateToken();
      setTokenValidation(isValid ? 'Token is valid' : 'Token is invalid');
    } catch (error) {
      setTokenValidation(`Token validation failed: ${error}`);
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem('authToken');
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.reload();
  };

  const getTokenInfo = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    return {
      expired: isTokenExpired(token),
      expiringSoon: isTokenExpiringSoon(token),
      timeRemaining: getTokenTimeRemaining(token),
    };
  };

  const tokenInfo = getTokenInfo();
  const currentUser = getCurrentUserFromToken();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Authentication System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
            <CardDescription>Information from useAuth hook</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {user ? (
              <>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> <Badge>{user.role}</Badge></p>
                <p><strong>Authenticated:</strong> <Badge variant={user.isAuthenticated ? 'default' : 'destructive'}>{user.isAuthenticated ? 'Yes' : 'No'}</Badge></p>
              </>
            ) : (
              <p>No user data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>Direct token analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tokenInfo ? (
              <>
                <p><strong>Expired:</strong> <Badge variant={tokenInfo.expired ? 'destructive' : 'default'}>{tokenInfo.expired ? 'Yes' : 'No'}</Badge></p>
                <p><strong>Expiring Soon:</strong> <Badge variant={tokenInfo.expiringSoon ? 'secondary' : 'default'}>{tokenInfo.expiringSoon ? 'Yes' : 'No'}</Badge></p>
                <p><strong>Time Remaining:</strong> {tokenInfo.timeRemaining} minutes</p>
              </>
            ) : (
              <p>No token found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current User (Direct)</CardTitle>
            <CardDescription>Direct token decode result</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentUser ? (
              <>
                <p><strong>ID:</strong> {currentUser.id}</p>
                <p><strong>Name:</strong> {currentUser.name}</p>
                <p><strong>Email:</strong> {currentUser.email}</p>
                <p><strong>Role:</strong> <Badge>{currentUser.role}</Badge></p>
              </>
            ) : (
              <p>No user data from direct token decode</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token Validation</CardTitle>
            <CardDescription>Test server-side token validation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleValidateToken}>
              Validate Token with Server
            </Button>
            {tokenValidation && (
              <p className="text-sm">{tokenValidation}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Test authentication actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={logout} variant="destructive">
              Logout (Proper)
            </Button>
            <Button onClick={handleClearToken} variant="outline">
              Clear Token (Force)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}