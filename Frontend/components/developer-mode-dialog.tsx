"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Code, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Shield, 
  Clock,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import { useDeveloperMode, DEVELOPER_MODE_CONFIG } from '@/contexts/DeveloperModeContext';
import { toast } from 'sonner';

interface DeveloperModeDialogProps {
  children: React.ReactNode;
  className?: string;
}

export function DeveloperModeDialog({ children, className }: DeveloperModeDialogProps) {
  const { 
    isDeveloperMode, 
    enableDeveloperMode, 
    disableDeveloperMode,
    getFormattedRemainingTime,
    triggerUpdate
  } = useDeveloperMode();
  
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = enableDeveloperMode(password);
      
      if (success) {
        toast.success('Developer Mode enabled successfully!');
        setPassword('');
        setIsOpen(false);
        // Force immediate UI update
        setTimeout(() => {
          triggerUpdate();
        }, 100);
      } else {
        setError('Invalid password. Please try again.');
        toast.error('Invalid developer password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      toast.error('Failed to enable Developer Mode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDeveloperMode = () => {
    if (isDeveloperMode) {
      disableDeveloperMode();
      toast.success('Developer Mode disabled');
      setIsOpen(false);
    } else {
      // Dialog will open for password input
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild className={className}>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Developer Mode
          </DialogTitle>
          <DialogDescription>
            Access advanced features and development tools
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              {isDeveloperMode ? (
                <>
                  <Unlock className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Enabled</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Disabled</span>
                </>
              )}
            </div>
            <Badge variant={isDeveloperMode ? "default" : "secondary"}>
              {isDeveloperMode ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Time remaining if enabled */}
          {isDeveloperMode && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Time remaining: {getFormattedRemainingTime()}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Enable Developer Mode Form */}
          {!isDeveloperMode && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="developer-password">Developer Password</Label>
                <div className="relative">
                  <Input
                    id="developer-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter developer password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable Developer Mode
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Disable Developer Mode */}
          {isDeveloperMode && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Developer Mode is currently active. You have access to advanced features including the Access Control System.
                </AlertDescription>
              </Alert>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleToggleDeveloperMode}
              >
                <Lock className="h-4 w-4 mr-2" />
                Disable Developer Mode
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
            <p className="font-medium mb-1">Developer Mode Features:</p>
            <ul className="list-disc list-inside space-y-1">
              {DEVELOPER_MODE_CONFIG.features.map((feature) => (
                <li key={feature.id}>{feature.description}</li>
              ))}
            </ul>
            <p className="mt-2 text-orange-600">
              ⚠️ Developer Mode automatically expires after 5 minutes
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}