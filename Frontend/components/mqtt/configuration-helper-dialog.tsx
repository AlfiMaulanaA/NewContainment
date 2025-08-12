"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Wifi,
  Shield,
  Clock,
  X
} from "lucide-react";
import { MqttConfiguration } from "@/lib/api-service";

interface ConfigurationHelperDialogProps {
  isOpen: boolean;
  onClose: () => void;
  configuration: MqttConfiguration | null;
  connectionStatus?: boolean;
}

export function ConfigurationHelperDialog({ 
  isOpen, 
  onClose, 
  configuration,
  connectionStatus = false 
}: ConfigurationHelperDialogProps) {
  if (!configuration) return null;

  const getPortRecommendation = (port: number | undefined, useSsl: boolean) => {
    if (useSsl) {
      if (port === 8883) return { status: 'correct', message: 'Port 8883 is correct for MQTT over SSL/TLS' };
      if (port === 443) return { status: 'warning', message: 'Port 443 is typically for HTTPS/WSS, not MQTT over SSL' };
      return { status: 'error', message: 'For SSL/TLS connections, use port 8883' };
    } else {
      if (port === 1883) return { status: 'correct', message: 'Port 1883 is correct for standard MQTT' };
      if (port === 443) return { status: 'error', message: 'Port 443 is for HTTPS/WSS. Use port 1883 for standard MQTT' };
      return { status: 'warning', message: 'Standard MQTT port is 1883' };
    }
  };

  const getConfigurationIssues = () => {
    const issues = [];
    
    // Port analysis
    const portRecommendation = getPortRecommendation(configuration.brokerPort, configuration.useSsl);
    if (portRecommendation.status === 'error' || portRecommendation.status === 'warning') {
      issues.push({
        type: portRecommendation.status,
        title: 'Port Configuration',
        message: portRecommendation.message,
        fix: configuration.useSsl ? 'Change port to 8883' : 'Change port to 1883'
      });
    }

    // SSL analysis
    if (configuration.brokerPort === 443 && !configuration.useSsl) {
      issues.push({
        type: 'error',
        title: 'SSL Mismatch',
        message: 'Port 443 typically requires SSL/TLS encryption',
        fix: 'Enable SSL or change port to 1883'
      });
    }

    // Connection timeout
    if (configuration.keepAliveInterval && configuration.keepAliveInterval > 300) {
      issues.push({
        type: 'warning',
        title: 'Keep Alive Too High',
        message: 'Keep alive interval over 5 minutes may cause connection issues',
        fix: 'Consider reducing to 60-120 seconds'
      });
    }

    return issues;
  };

  const getSuggestedConfiguration = () => {
    const current = configuration;
    const suggestions = [];

    // Working configuration for mqttws.iotech.my.id
    if (current.brokerHost === 'mqttws.iotech.my.id') {
      suggestions.push({
        title: 'Standard MQTT (Recommended)',
        config: {
          brokerHost: 'mqttws.iotech.my.id',
          brokerPort: 1883,
          useSsl: false,
          keepAliveInterval: 120,
          reconnectDelay: 10
        },
        description: 'This matches the working MQTT Box configuration'
      });

      if (current.useSsl) {
        suggestions.push({
          title: 'MQTT over SSL/TLS',
          config: {
            brokerHost: 'mqttws.iotech.my.id',
            brokerPort: 8883,
            useSsl: true,
            keepAliveInterval: 120,
            reconnectDelay: 10
          },
          description: 'For encrypted connections (if broker supports it)'
        });
      }
    }

    return suggestions;
  };

  const issues = getConfigurationIssues();
  const suggestions = getSuggestedConfiguration();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            MQTT Configuration Analysis
          </DialogTitle>
          <DialogDescription>
            Analysis and recommendations for your MQTT configuration
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wifi className="h-4 w-4" />
                Current Configuration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Connection</span>
                  <div className="mt-1">
                    {connectionStatus ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Disconnected
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Broker</span>
                  <p className="mt-1 font-mono text-xs">{configuration.brokerHost}:{configuration.brokerPort}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SSL</span>
                  <p className="mt-1">{configuration.useSsl ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Keep Alive</span>
                  <p className="mt-1">{configuration.keepAliveInterval}s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues Found */}
          {issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Configuration Issues ({issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {issues.map((issue, index) => (
                  <Alert key={index} className={issue.type === 'error' ? 'border-red-200' : 'border-yellow-200'}>
                    <AlertTriangle className={`h-4 w-4 ${issue.type === 'error' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div>
                      <div className="font-semibold text-sm">{issue.title}</div>
                      <AlertDescription className="text-xs">{issue.message}</AlertDescription>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          Fix: {issue.fix}
                        </Badge>
                      </div>
                    </div>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggested Configurations */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Recommended Configurations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{suggestion.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Host</span>
                        <p className="font-mono">{suggestion.config.brokerHost}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Port</span>
                        <p className="font-mono">{suggestion.config.brokerPort}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SSL</span>
                        <p>{suggestion.config.useSsl ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Keep Alive</span>
                        <p>{suggestion.config.keepAliveInterval}s</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Working MQTT Box Configuration */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle className="h-4 w-4" />
                Working MQTT Box Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <p className="text-green-700 mb-2">This configuration works in MQTT Box:</p>
                <div className="bg-white p-3 rounded border font-mono text-xs">
                  Protocol: mqtt/tcp<br/>
                  Host: mqttws.iotech.my.id<br/>
                  Port: 1883<br/>
                  SSL: Disabled
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onClose}>
            Got It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}