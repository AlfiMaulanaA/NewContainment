"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Save, X } from "lucide-react";
import type { ZKTecoDevice } from "@/types/zkteco";

// Form validation schema
const deviceSchema = z.object({
  id: z.string()
    .min(1, "Device ID is required")
    .regex(/^[a-zA-Z0-9_-]+$/, "Device ID can only contain letters, numbers, underscore, and dash"),
  name: z.string()
    .min(1, "Device name is required")
    .max(100, "Device name must be less than 100 characters"),
  ip: z.string()
    .min(1, "IP address is required")
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "Invalid IP address format"),
  port: z.number()
    .min(1, "Port must be greater than 0")
    .max(65535, "Port must be less than 65536"),
  password: z.number()
    .min(0, "Password must be 0 or greater"),
  timeout: z.number()
    .min(1, "Timeout must be at least 1 second")
    .max(60, "Timeout must be less than 60 seconds"),
  force_udp: z.boolean(),
  enabled: z.boolean()
});

type DeviceFormData = z.infer<typeof deviceSchema>;

interface DeviceFormProps {
  device?: ZKTecoDevice;
  onSubmit: (data: DeviceFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function DeviceForm({ 
  device, 
  onSubmit, 
  onCancel, 
  loading = false, 
  error = null 
}: DeviceFormProps) {
  const isEditing = !!device;
  
  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: device || {
      id: "",
      name: "",
      ip: "",
      port: 4370,
      password: 0,
      timeout: 10,
      force_udp: false,
      enabled: true
    }
  });

  const handleSubmit = async (data: DeviceFormData) => {
    const success = await onSubmit(data);
    if (success) {
      if (!isEditing) {
        form.reset(); // Reset form untuk add mode
      }
    }
  };

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {isEditing ? 'Edit Device' : 'Add New Device'}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the device configuration below'
            : 'Configure a new ZKTeco device for access control system'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">Device ID *</Label>
                <Input
                  id="id"
                  placeholder="device_1"
                  disabled={isEditing || loading} // ID tidak bisa diubah saat edit
                  {...form.register("id")}
                />
                {form.formState.errors.id && (
                  <p className="text-sm text-destructive">{form.formState.errors.id.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  placeholder="Front Door"
                  disabled={loading}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Network Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ip">IP Address *</Label>
                <Input
                  id="ip"
                  placeholder="192.168.0.201"
                  disabled={loading}
                  {...form.register("ip")}
                />
                {form.formState.errors.ip && (
                  <p className="text-sm text-destructive">{form.formState.errors.ip.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="4370"
                  disabled={loading}
                  {...form.register("port", { valueAsNumber: true })}
                />
                {form.formState.errors.port && (
                  <p className="text-sm text-destructive">{form.formState.errors.port.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Advanced Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Device Password</Label>
                <Input
                  id="password"
                  type="number"
                  placeholder="0"
                  disabled={loading}
                  {...form.register("password", { valueAsNumber: true })}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  placeholder="10"
                  disabled={loading}
                  {...form.register("timeout", { valueAsNumber: true })}
                />
                {form.formState.errors.timeout && (
                  <p className="text-sm text-destructive">{form.formState.errors.timeout.message}</p>
                )}
              </div>
            </div>
            
            {/* Boolean Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="force_udp">Force UDP Connection</Label>
                  <p className="text-sm text-muted-foreground">
                    Force UDP protocol instead of TCP
                  </p>
                </div>
                <Switch
                  id="force_udp"
                  disabled={loading}
                  checked={form.watch("force_udp")}
                  onCheckedChange={(checked) => form.setValue("force_udp", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled">Device Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this device for active monitoring
                  </p>
                </div>
                <Switch
                  id="enabled"
                  disabled={loading}
                  checked={form.watch("enabled")}
                  onCheckedChange={(checked) => form.setValue("enabled", checked)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={loading || !form.formState.isValid}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Device' : 'Add Device'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}