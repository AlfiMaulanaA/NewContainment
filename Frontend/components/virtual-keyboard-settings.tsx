"use client";

import { useVirtualKeyboardSettings } from '@/contexts/virtual-keyboard-context';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  Keyboard,
  Layout,
  Monitor,
  RotateCw,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';

export function VirtualKeyboardSettings() {
  const { settings, updateSettings, toggleEnabled } = useVirtualKeyboardSettings();

  const handleLayoutChange = (value: 'qwerty' | 'numeric') => {
    updateSettings({ defaultLayout: value });
    toast.success(`Default layout changed to ${value.toUpperCase()}`);
  };

  const handlePositionChange = (value: 'bottom' | 'center' | 'top' | 'left' | 'right') => {
    updateSettings({ defaultPosition: value });
    toast.success(`Default position changed to ${value}`);
  };

  const handleAutoShowChange = (checked: boolean) => {
    updateSettings({ autoShow: checked });
    toast.success(`Auto show ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleAutoHideChange = (checked: boolean) => {
    updateSettings({ autoHide: checked });
    toast.success(`Auto hide ${checked ? 'enabled' : 'disabled'}`);
  };


  const resetToDefaults = () => {
    updateSettings({
      enabled: true,
      defaultLayout: 'qwerty',
      defaultPosition: 'bottom',
      autoShow: true,
      autoHide: true
    });
    toast.success('Virtual keyboard settings reset to defaults');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-primary" />
          Virtual Keyboard Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="keyboard-enabled" className="text-base font-medium">
                Enable Virtual Keyboard
              </Label>
              <Badge variant={settings.enabled ? "default" : "secondary"} className="text-xs">
                {settings.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Show virtual keyboard for input fields across the application
            </p>
          </div>
          <Switch
            id="keyboard-enabled"
            checked={settings.enabled}
            onCheckedChange={toggleEnabled}
          />
        </div>

        {settings.enabled && (
          <>
            <Separator />

            {/* Responsive Design Info */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  Responsive Design
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Virtual keyboard automatically adapts to all screen sizes including mobile, tablet, and desktop
              </p>
            </div>

            <Separator />

            {/* Layout Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Default Layout</Label>
              </div>
              <Select
                value={settings.defaultLayout}
                onValueChange={handleLayoutChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qwerty">QWERTY (Full Keyboard)</SelectItem>
                  <SelectItem value="numeric">Numeric (Number Pad)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default keyboard layout for input fields
              </p>
            </div>

            {/* Position Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Default Position</Label>
              </div>
              <Select
                value={settings.defaultPosition}
                onValueChange={handlePositionChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default position where keyboard appears on screen
              </p>
            </div>

            <Separator />

            {/* Behavior Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Behavior Settings</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-show" className="text-sm font-medium">
                    Auto Show
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically show keyboard when input is focused
                  </p>
                </div>
                <Switch
                  id="auto-show"
                  checked={settings.autoShow}
                  onCheckedChange={handleAutoShowChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-hide" className="text-sm font-medium">
                    Auto Hide
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically hide keyboard when clicking outside
                  </p>
                </div>
                <Switch
                  id="auto-hide"
                  checked={settings.autoHide}
                  onCheckedChange={handleAutoHideChange}
                />
              </div>
            </div>

            <Separator />

            {/* Current Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-bold text-primary mb-1">
                  {settings.defaultLayout.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">Layout</div>
              </div>

              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-bold text-primary mb-1">
                  {settings.defaultPosition}
                </div>
                <div className="text-xs text-muted-foreground">Position</div>
              </div>

              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-bold text-primary mb-1">
                  {settings.autoShow ? 'ON' : 'OFF'}
                </div>
                <div className="text-xs text-muted-foreground">Auto Show</div>
              </div>

              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-bold text-primary mb-1">
                  {settings.autoHide ? 'ON' : 'OFF'}
                </div>
                <div className="text-xs text-muted-foreground">Auto Hide</div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={resetToDefaults}
                className="w-full gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}