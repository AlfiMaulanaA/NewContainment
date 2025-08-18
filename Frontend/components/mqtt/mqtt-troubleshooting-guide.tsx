"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  WifiOff, 
  AlertTriangle, 
  Info,
  Settings,
  Terminal,
  CheckCircle 
} from "lucide-react";
import { useMQTT } from "@/hooks/useMQTT";

interface MQTTTroubleshootingGuideProps {
  isVisible: boolean;
  connectionError?: string;
  onClose?: () => void;
}

export function MQTTTroubleshootingGuide({ 
  isVisible, 
  connectionError,
  onClose 
}: MQTTTroubleshootingGuideProps) {
  const { getStatus } = useMQTT();
  const config = getStatus()?.config;

  if (!isVisible) return null;

  const isWebSocketBridge = config?.brokerPort === 9000 || config?.brokerPort === 9001;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800 flex items-center gap-2">
          <WifiOff className="h-5 w-5" />
          MQTT Connection Failed
        </CardTitle>
        <CardDescription className="text-red-700">
          Troubleshoot your MQTT connection issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Configuration */}
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Configuration:</strong>
            <br />
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
              {config?.useSsl ? 'wss' : 'ws'}://{config?.brokerHost}:{config?.brokerPort}
              {isWebSocketBridge ? '/mqtt' : ''}
            </code>
            <br />
            Source: <Badge variant="outline">{config?.source || 'unknown'}</Badge>
          </AlertDescription>
        </Alert>

        {/* Error Details */}
        {connectionError && (
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {connectionError}
            </AlertDescription>
          </Alert>
        )}

        {/* Troubleshooting Steps */}
        <div className="space-y-3">
          <h4 className="font-semibold text-red-800 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Troubleshooting Steps
          </h4>

          <div className="space-y-2 text-sm">
            {isWebSocketBridge ? (
              <>
                <div className="flex items-start gap-2">
                  <Terminal className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div>
                    <strong>1. Check WebSocket Bridge</strong>
                    <p className="text-muted-foreground">
                      Make sure MQTT WebSocket bridge is running on port {config?.brokerPort}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 mt-0.5 text-green-500" />
                  <div>
                    <strong>2. Start WebSocket Bridge</strong>
                    <p className="text-muted-foreground">
                      You need a WebSocket-to-MQTT bridge service running. 
                      Check if you have mosquitto with WebSocket support or similar bridge.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
                <div>
                  <strong>Direct MQTT Connection</strong>
                  <p className="text-muted-foreground">
                    Using port {config?.brokerPort}. Make sure your MQTT broker supports WebSocket connections.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-purple-500" />
              <div>
                <strong>3. Check Configuration</strong>
                <p className="text-muted-foreground">
                  Verify MQTT settings in the configuration page match your broker setup.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <WifiOff className="h-4 w-4 mt-0.5 text-red-500" />
              <div>
                <strong>4. Network Connectivity</strong>
                <p className="text-muted-foreground">
                  Ensure {config?.brokerHost}:{config?.brokerPort} is accessible from your browser.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Fix Suggestions */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Quick Fix:</strong> 
            {isWebSocketBridge 
              ? " Start an MQTT WebSocket bridge on port " + config?.brokerPort + " or change the port in MQTT configuration."
              : " Ensure your MQTT broker supports WebSocket connections or use a WebSocket bridge."
            }
          </AlertDescription>
        </Alert>

        {onClose && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Close Guide
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}