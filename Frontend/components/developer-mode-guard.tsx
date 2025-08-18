"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DeveloperModeDialog } from '@/components/developer-mode-dialog';
import { useDeveloperMode } from '@/contexts/DeveloperModeContext';
import { 
  Lock, 
  Code, 
  Shield, 
  AlertTriangle, 
  Fingerprint,
  UserCheck,
  Activity
} from 'lucide-react';

interface DeveloperModeGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DeveloperModeGuard({ children, fallback }: DeveloperModeGuardProps) {
  const { isDeveloperMode, isLoading } = useDeveloperMode();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (isDeveloperMode) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback UI
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-orange-100 rounded-full">
              <Lock className="h-12 w-12 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Developer Mode Required</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              This section requires Developer Mode to be enabled. Please enter the developer password to continue.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Code className="h-4 w-4" />
              Access Control System Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span>ZKTeco Device Management</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span>User Access Management</span>
              </div>
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-purple-500" />
                <span>Biometric Registration</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                <span>Live Monitoring System</span>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <DeveloperModeDialog>
              <Button size="lg" className="px-8">
                <Shield className="h-4 w-4 mr-2" />
                Enable Developer Mode
              </Button>
            </DeveloperModeDialog>
            
            <p className="text-xs text-muted-foreground">
              Developer access is required for security and advanced features.
              <br />
              Contact your system administrator if you need access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}