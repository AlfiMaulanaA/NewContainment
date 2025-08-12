"use client";

import React, { useState } from 'react';
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Gamepad2, 
  DoorOpen, 
  DoorClosed, 
  ArrowUp, 
  ArrowDown,
  Settings,
  Upload,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { useMQTTPublish } from '@/hooks/useMQTTPublish';
import { useMQTTStatus } from '@/hooks/useMQTTStatus';
import { useMQTTConnection } from '@/hooks/useMQTTConnection';
import { MQTTTroubleshootingGuide } from '@/components/mqtt/mqtt-troubleshooting-guide';
import MQTTConnectionBadge from '@/components/mqtt-status';
import { toast } from 'sonner';

interface ControlState {
  frontDoorAlwaysOpen: boolean;
  backDoorAlwaysOpen: boolean;
  ceilingState: boolean; // true = open, false = closed
}

interface PublishHistory {
  id: string;
  timestamp: Date;
  command: string;
  topic: string;
  success: boolean;
}

export default function ContainmentControlPage() {
  const [controlState, setControlState] = useState<ControlState>({
    frontDoorAlwaysOpen: false,
    backDoorAlwaysOpen: false,
    ceilingState: false
  });
  
  const [publishHistory, setPublishHistory] = useState<PublishHistory[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  
  const { publishControlCommand } = useMQTTPublish();
  const mqttStatus = useMQTTStatus();
  const { isInitializing } = useMQTTConnection(); // Auto-initialize MQTT connection

  const addToHistory = (command: string, success: boolean) => {
    const historyItem: PublishHistory = {
      id: Date.now().toString(),
      timestamp: new Date(),
      command,
      topic: "IOT/Containment/Control",
      success
    };
    
    setPublishHistory(prev => [historyItem, ...prev.slice(0, 19)]); // Keep last 20 items
  };

  // Door control functions
  const handleOpenFrontDoor = async () => {
    setIsPublishing(true);
    const success = await publishControlCommand("Open front door");
    addToHistory("Open front door", success);
    setIsPublishing(false);
  };

  const handleOpenBackDoor = async () => {
    setIsPublishing(true);
    const success = await publishControlCommand("Open back door");
    addToHistory("Open back door", success);
    setIsPublishing(false);
  };

  // Always open door toggles
  const handleFrontDoorAlwaysToggle = async (enabled: boolean) => {
    setIsPublishing(true);
    const command = enabled ? "Open front door always enable" : "Open front door always disable";
    const success = await publishControlCommand(command);
    
    if (success) {
      setControlState(prev => ({ ...prev, frontDoorAlwaysOpen: enabled }));
    }
    
    addToHistory(command, success);
    setIsPublishing(false);
  };

  const handleBackDoorAlwaysToggle = async (enabled: boolean) => {
    setIsPublishing(true);
    const command = enabled ? "Open back door always enable" : "Open back door always disable";
    const success = await publishControlCommand(command);
    
    if (success) {
      setControlState(prev => ({ ...prev, backDoorAlwaysOpen: enabled }));
    }
    
    addToHistory(command, success);
    setIsPublishing(false);
  };

  // Ceiling control functions
  const handleCeilingControl = async (open: boolean) => {
    setIsPublishing(true);
    const command = open ? "Open Ceiiling" : "Close Ceiiling"; // Note: keeping original spelling from requirements
    const success = await publishControlCommand(command);
    
    if (success) {
      setControlState(prev => ({ ...prev, ceilingState: open }));
    }
    
    addToHistory(command, success);
    setIsPublishing(false);
  };

  // Config update function
  const handleUpdateConfigFromJson = async () => {
    setIsPublishing(true);
    const success = await publishControlCommand("Update Config from json");
    addToHistory("Update Config from json", success);
    setIsPublishing(false);
  };

  const getMQTTStatusIcon = () => {
    if (isInitializing) {
      return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
    }
    
    switch (mqttStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500 animate-pulse" />;
    }
  };

  const isConnected = mqttStatus === 'connected';

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Containment Control</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <MQTTConnectionBadge />
          {getMQTTStatusIcon()}
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-muted-foreground">
          Control containment doors and ceiling via MQTT commands
        </p>

        {/* Connection Status Alert */}
        {isInitializing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Activity className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">
                  Initializing MQTT connection...
                </span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {!isInitializing && !isConnected && (
          <div className="space-y-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      MQTT connection required to send control commands.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  >
                    {showTroubleshooting ? "Hide" : "Show"} Troubleshooting
                  </Button>
                </div>
              </CardContent>
            </Card>

            <MQTTTroubleshootingGuide
              isVisible={showTroubleshooting}
              connectionError={mqttStatus === 'error' ? 'WebSocket connection failed' : undefined}
              onClose={() => setShowTroubleshooting(false)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Door Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                Door Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Manual Door Open Buttons */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Manual Door Control</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={handleOpenFrontDoor}
                    disabled={!isConnected || isPublishing}
                    className="h-12 flex items-center justify-center gap-2"
                  >
                    <DoorOpen className="h-4 w-4" />
                    Open Front Door
                  </Button>
                  
                  <Button 
                    onClick={handleOpenBackDoor}
                    disabled={!isConnected || isPublishing}
                    className="h-12 flex items-center justify-center gap-2"
                  >
                    <DoorOpen className="h-4 w-4" />
                    Open Back Door
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Always Open Toggles */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Always Open Mode</h3>
                
                {/* Front Door Always Open */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {controlState.frontDoorAlwaysOpen ? (
                      <DoorOpen className="h-4 w-4 text-green-500" />
                    ) : (
                      <DoorClosed className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <Label className="font-medium">Front Door Always Open</Label>
                      <div className="text-xs text-muted-foreground">
                        Keep front door permanently open
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={controlState.frontDoorAlwaysOpen}
                    onCheckedChange={handleFrontDoorAlwaysToggle}
                    disabled={!isConnected || isPublishing}
                  />
                </div>

                {/* Back Door Always Open */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {controlState.backDoorAlwaysOpen ? (
                      <DoorOpen className="h-4 w-4 text-green-500" />
                    ) : (
                      <DoorClosed className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <Label className="font-medium">Back Door Always Open</Label>
                      <div className="text-xs text-muted-foreground">
                        Keep back door permanently open
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={controlState.backDoorAlwaysOpen}
                    onCheckedChange={handleBackDoorAlwaysToggle}
                    disabled={!isConnected || isPublishing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ceiling and System Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Ceiling & System Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ceiling Control */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Ceiling Control</h3>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {controlState.ceilingState ? (
                      <ArrowDown className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <Label className="font-medium">Ceiling Position</Label>
                      <div className="text-xs text-muted-foreground">
                        Current: {controlState.ceilingState ? 'Open' : 'Closed'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={controlState.ceilingState ? "default" : "outline"}
                      onClick={() => handleCeilingControl(true)}
                      disabled={!isConnected || isPublishing}
                    >
                      <ArrowUp className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant={!controlState.ceilingState ? "default" : "outline"}
                      onClick={() => handleCeilingControl(false)}
                      disabled={!isConnected || isPublishing}
                    >
                      <ArrowDown className="h-3 w-3 mr-1" />
                      Close
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* System Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">System Configuration</h3>
                
                <Button 
                  onClick={handleUpdateConfigFromJson}
                  disabled={!isConnected || isPublishing}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Update Config from JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Command History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Command History
              <Badge variant="secondary" className="ml-2">
                {publishHistory.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publishHistory.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {publishHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{item.command}</div>
                        <div className="text-xs text-muted-foreground">
                          Topic: {item.topic}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.success ? "default" : "destructive"}>
                        {item.success ? "Published" : "Failed"}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No commands sent yet</p>
                <p className="text-sm">Use the controls above to send MQTT commands</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MQTT Topic Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              MQTT Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-700 space-y-2">
              <div className="flex items-center gap-2">
                <strong>Topic:</strong>
                <code className="bg-blue-100 px-2 py-1 rounded text-sm">
                  IOT/Containment/Control
                </code>
              </div>
              <div className="text-sm">
                <strong>Payload Format:</strong>
                <code className="bg-blue-100 px-2 py-1 rounded text-sm ml-1">
                  {"{ \"data\": \"command\" }"}
                </code>
              </div>
              <div className="text-sm">
                All control commands are published to the same topic with different data values.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}