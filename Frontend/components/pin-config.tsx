"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Wifi,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Power,
  Cpu,
  Eye,
  Shield,
  DoorOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useMQTT } from "@/hooks/useMQTT";
import { useMQTTStatus } from "@/hooks/useMQTTStatus";
import { useMQTTPublish } from "@/hooks/useMQTTPublish";

// Types for pin configuration
interface PinConfig {
  pir_sensor_pin: number;
  fss_pin: number;
  smoke_sensor_pin_button_emergency_pin: number;
  button_front_door_pin: number;
  button_back_door_pin: number;
  limit_switch_back_door_pin: number;
  limit_switch_front_door: number;
  relay_light_pin: number;
  relay_magnetic_back_door_pin: number;
  relay_magnetic_pin: number;
  relay_mini_selenoid_open: number;
  relay_mini_selenoid_close: number;
  relay_mini_front_door_pin: number;
  relay_mini_back_door_pin: number;
  relay_mini_door_emergency: number;
}

interface PinConfigResponse {
  optocoupler: {
    pir_sensor_pin: number;
    fss_pin: number;
    smoke_sensor_pin_button_emergency_pin: number;
    button_front_door_pin: number;
    button_back_door_pin: number;
    limit_switch_back_door_pin: number;
    limit_switch_front_door: number;
  };
  relay: {
    relay_light_pin: number;
    relay_magnetic_back_door_pin: number;
    relay_magnetic_pin: number;
  };
  relay_mini: {
    relay_mini_selenoid_open: number;
    relay_mini_selenoid_close: number;
    relay_mini_front_door_pin: number;
    relay_mini_back_door_pin: number;
    relay_mini_door_emergency: number;
  };
}

interface MqttResponse {
  success?: boolean;
  result?: string;
}

const defaultPinConfig: PinConfig = {
  pir_sensor_pin: 1,
  fss_pin: 2,
  smoke_sensor_pin_button_emergency_pin: 3,
  button_front_door_pin: 4,
  button_back_door_pin: 5,
  limit_switch_back_door_pin: 6,
  limit_switch_front_door: 7,
  relay_light_pin: 1,
  relay_magnetic_back_door_pin: 6,
  relay_magnetic_pin: 7,
  relay_mini_selenoid_open: 1,
  relay_mini_selenoid_close: 2,
  relay_mini_front_door_pin: 3,
  relay_mini_back_door_pin: 4,
  relay_mini_door_emergency: 5,
};

export function PinConfigComponent() {
  const [config, setConfig] = useState<PinConfig>(defaultPinConfig);
  const [originalConfig, setOriginalConfig] =
    useState<PinConfig>(defaultPinConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Use existing MQTT hooks
  const mqttStatus = useMQTTStatus();
  const { publishMessage } = useMQTTPublish();
  const { subscribe, unsubscribe, isConnected } = useMQTT();
  const isConnectedStatus = isConnected;

  // MQTT Topics
  const TOPICS = {
    PIN_CONFIG: "IOT/Containment/Control/Config/Pin",
    CURRENT_PIN_CONFIG: "IOT/Containment/Control/Current_Config/Pin",
  };

  // Subscribe to MQTT messages
  useEffect(() => {
    const handleMessage = (topic: string, message: string) => {
      if (topic === TOPICS.CURRENT_PIN_CONFIG) {
        try {
          const response = JSON.parse(message);
          console.log("Received pin config response:", response);

          // Check if it's a command response or actual config data
          if (response.success !== undefined || response.result !== undefined) {
            // Handle command response
            const mqttResponse = response as MqttResponse;
            if (mqttResponse.success) {
              toast.success(
                mqttResponse.result || "Pin configuration updated successfully"
              );
            } else {
              toast.error(
                mqttResponse.result || "Failed to update pin configuration"
              );
              setValidationErrors([mqttResponse.result || "Unknown error"]);
            }
          } else {
            // Handle actual config data
            const receivedConfig = response as PinConfigResponse;
            const flatConfig: PinConfig = {
              // Optocoupler pins
              pir_sensor_pin: receivedConfig.optocoupler.pir_sensor_pin,
              fss_pin: receivedConfig.optocoupler.fss_pin,
              smoke_sensor_pin_button_emergency_pin:
                receivedConfig.optocoupler
                  .smoke_sensor_pin_button_emergency_pin,
              button_front_door_pin:
                receivedConfig.optocoupler.button_front_door_pin,
              button_back_door_pin:
                receivedConfig.optocoupler.button_back_door_pin,
              limit_switch_back_door_pin:
                receivedConfig.optocoupler.limit_switch_back_door_pin,
              limit_switch_front_door:
                receivedConfig.optocoupler.limit_switch_front_door,
              // Relay pins
              relay_light_pin: receivedConfig.relay.relay_light_pin,
              relay_magnetic_back_door_pin:
                receivedConfig.relay.relay_magnetic_back_door_pin,
              relay_magnetic_pin: receivedConfig.relay.relay_magnetic_pin,
              // Relay mini pins
              relay_mini_selenoid_open:
                receivedConfig.relay_mini.relay_mini_selenoid_open,
              relay_mini_selenoid_close:
                receivedConfig.relay_mini.relay_mini_selenoid_close,
              relay_mini_front_door_pin:
                receivedConfig.relay_mini.relay_mini_front_door_pin,
              relay_mini_back_door_pin:
                receivedConfig.relay_mini.relay_mini_back_door_pin,
              relay_mini_door_emergency:
                receivedConfig.relay_mini.relay_mini_door_emergency,
            };

            setConfig(flatConfig);
            setOriginalConfig(flatConfig);
            setLastUpdated(new Date());
            setHasChanges(false);
            setValidationErrors([]);
            toast.success("Pin configuration received from device");
          }
        } catch (error) {
          console.error("Failed to parse pin config message:", error);
          toast.error("Failed to parse pin configuration from device");
        }
      }
    };

    if (isConnectedStatus) {
      subscribe(TOPICS.CURRENT_PIN_CONFIG, handleMessage, "pin-config");
      // Request current configuration on connect
      requestCurrentPinConfig();
    }

    return () => {
      unsubscribe(TOPICS.CURRENT_PIN_CONFIG, "pin-config");
    };
  }, [isConnectedStatus]);

  // Check for changes
  useEffect(() => {
    const hasConfigChanges =
      JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(hasConfigChanges);

    // Validate configuration when it changes
    if (hasConfigChanges) {
      validatePinConfig(config);
    } else {
      setValidationErrors([]);
    }
  }, [config, originalConfig]);

  const validatePinConfig = (pinConfig: PinConfig) => {
    const errors: string[] = [];

    // Define pin ranges
    const optocouplerPins = [
      pinConfig.pir_sensor_pin,
      pinConfig.fss_pin,
      pinConfig.smoke_sensor_pin_button_emergency_pin,
      pinConfig.button_front_door_pin,
      pinConfig.button_back_door_pin,
      pinConfig.limit_switch_back_door_pin,
      pinConfig.limit_switch_front_door,
    ];

    const relayPins = [
      pinConfig.relay_light_pin,
      pinConfig.relay_magnetic_back_door_pin,
      pinConfig.relay_magnetic_pin,
    ];

    const relayMiniPins = [
      pinConfig.relay_mini_selenoid_open,
      pinConfig.relay_mini_selenoid_close,
      pinConfig.relay_mini_front_door_pin,
      pinConfig.relay_mini_back_door_pin,
      pinConfig.relay_mini_door_emergency,
    ];

    // Check optocoupler pin range (1-7)
    optocouplerPins.forEach((pin, index) => {
      if (pin < 1 || pin > 7) {
        errors.push(`Optocoupler pin ${index + 1} is out of range (1-7)`);
      }
    });

    // Check relay pin range (1-7)
    relayPins.forEach((pin, index) => {
      if (pin < 1 || pin > 7) {
        errors.push(`Relay pin ${index + 1} is out of range (1-7)`);
      }
    });

    // Check relay mini pin range (1-6)
    relayMiniPins.forEach((pin, index) => {
      if (pin < 1 || pin > 6) {
        errors.push(`Relay mini pin ${index + 1} is out of range (1-6)`);
      }
    });

    // Check for duplicate pins within each category
    const optocouplerDuplicates = optocouplerPins.filter(
      (pin, index) => optocouplerPins.indexOf(pin) !== index
    );
    if (optocouplerDuplicates.length > 0) {
      errors.push(
        `Duplicate pins in optocoupler configuration: ${[
          ...new Set(optocouplerDuplicates),
        ].join(", ")}`
      );
    }

    const relayDuplicates = relayPins.filter(
      (pin, index) => relayPins.indexOf(pin) !== index
    );
    if (relayDuplicates.length > 0) {
      errors.push(
        `Duplicate pins in relay configuration: ${[
          ...new Set(relayDuplicates),
        ].join(", ")}`
      );
    }

    const relayMiniDuplicates = relayMiniPins.filter(
      (pin, index) => relayMiniPins.indexOf(pin) !== index
    );
    if (relayMiniDuplicates.length > 0) {
      errors.push(
        `Duplicate pins in relay mini configuration: ${[
          ...new Set(relayMiniDuplicates),
        ].join(", ")}`
      );
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const requestCurrentPinConfig = async () => {
    if (!isConnectedStatus) {
      toast.error("MQTT not connected");
      return;
    }

    setIsLoading(true);

    const payload = {
      data: "Get Data Setting",
    };

    const success = await publishMessage(TOPICS.PIN_CONFIG, payload);
    if (success) {
      console.log("Requested current pin config");
      toast.info("Requesting current pin configuration...");
      // Loading will be cleared when response is received
      setTimeout(() => setIsLoading(false), 5000); // Timeout after 5 seconds
    } else {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (key: keyof PinConfig, value: number) => {
    if (value < 1) return; // Don't allow values less than 1

    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSavePinConfig = async () => {
    if (!isConnectedStatus) {
      toast.error("MQTT not connected");
      return;
    }

    // Validate before saving
    if (!validatePinConfig(config)) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    const payload = {
      data: "Change Setting Pin",
      value: {
        pir_sensor_pin: config.pir_sensor_pin,
        fss_pin: config.fss_pin,
        smoke_sensor_pin_button_emergency_pin:
          config.smoke_sensor_pin_button_emergency_pin,
        button_front_door_pin: config.button_front_door_pin,
        button_back_door_pin: config.button_back_door_pin,
        limit_switch_back_door_pin: config.limit_switch_back_door_pin,
        limit_switch_front_door: config.limit_switch_front_door,
        relay_light_pin: config.relay_light_pin,
        relay_mini_selenoid_open: config.relay_mini_selenoid_open,
        relay_mini_selenoid_close: config.relay_mini_selenoid_close,
        relay_mini_front_door_pin: config.relay_mini_front_door_pin,
        relay_mini_back_door_pin: config.relay_mini_back_door_pin,
        relay_mini_door_emergency: config.relay_mini_door_emergency,
      },
    };

    const success = await publishMessage(TOPICS.PIN_CONFIG, payload);
    if (success) {
      console.log("Published pin configuration");
      toast.info("Saving pin configuration...");
      setOriginalConfig({ ...config });
    }
  };

  const resetToDefault = () => {
    setConfig(defaultPinConfig);
    toast.info("Pin configuration reset to default values");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">Pin Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Configure IoT pin assignments for optocoupler, relay, and relay
              mini modules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={mqttStatus === "connected" ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            <Wifi className="h-3 w-3" />
            {mqttStatus === "connected" ? "Connected" : "Disconnected"}
          </Badge>

          {lastUpdated && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Configuration Errors:</div>
              {validationErrors.map((error, index) => (
                <div key={index} className="text-sm">
                  • {error}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={requestCurrentPinConfig}
          disabled={!isConnectedStatus || isLoading}
          variant="outline"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Loading..." : "Refresh Config"}
        </Button>

        <Button
          onClick={handleSavePinConfig}
          disabled={
            !isConnectedStatus || !hasChanges || validationErrors.length > 0
          }
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Pin Configuration
        </Button>

        <Button onClick={resetToDefault} variant="outline">
          Reset to Default
        </Button>

        {hasChanges && (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Unsaved Changes
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Optocoupler Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Optocoupler Pins (1-7)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pir_sensor">PIR Sensor Pin</Label>
              <Input
                id="pir_sensor"
                type="number"
                min="1"
                max="7"
                value={config.pir_sensor_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "pir_sensor_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fss">FSS Pin</Label>
              <Input
                id="fss"
                type="number"
                min="1"
                max="7"
                value={config.fss_pin}
                onChange={(e) =>
                  handleConfigChange("fss_pin", parseInt(e.target.value) || 1)
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="smoke_sensor">
                Smoke Sensor/Emergency Button Pin
              </Label>
              <Input
                id="smoke_sensor"
                type="number"
                min="1"
                max="7"
                value={config.smoke_sensor_pin_button_emergency_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "smoke_sensor_pin_button_emergency_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="button_front" className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4" />
                Front Door Button Pin
              </Label>
              <Input
                id="button_front"
                type="number"
                min="1"
                max="7"
                value={config.button_front_door_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "button_front_door_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="button_back" className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4" />
                Back Door Button Pin
              </Label>
              <Input
                id="button_back"
                type="number"
                min="1"
                max="7"
                value={config.button_back_door_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "button_back_door_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="limit_back">Limit Switch Back Door Pin</Label>
              <Input
                id="limit_back"
                type="number"
                min="1"
                max="7"
                value={config.limit_switch_back_door_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "limit_switch_back_door_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="limit_front">Limit Switch Front Door Pin</Label>
              <Input
                id="limit_front"
                type="number"
                min="1"
                max="7"
                value={config.limit_switch_front_door}
                onChange={(e) =>
                  handleConfigChange(
                    "limit_switch_front_door",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Relay Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Relay Pins (1-7)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="relay_light">Light Relay Pin</Label>
              <Input
                id="relay_light"
                type="number"
                min="1"
                max="7"
                value={config.relay_light_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_light_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="relay_mag_back">
                Magnetic Back Door Relay Pin
              </Label>
              <Input
                id="relay_mag_back"
                type="number"
                min="1"
                max="7"
                value={config.relay_magnetic_back_door_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_magnetic_back_door_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="relay_mag">Magnetic Relay Pin</Label>
              <Input
                id="relay_mag"
                type="number"
                min="1"
                max="7"
                value={config.relay_magnetic_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_magnetic_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Relay Mini Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Relay Mini Pins (1-6)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mini_selenoid_open">Selenoid Open Pin</Label>
              <Input
                id="mini_selenoid_open"
                type="number"
                min="1"
                max="6"
                value={config.relay_mini_selenoid_open}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_mini_selenoid_open",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="mini_selenoid_close">Selenoid Close Pin</Label>
              <Input
                id="mini_selenoid_close"
                type="number"
                min="1"
                max="6"
                value={config.relay_mini_selenoid_close}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_mini_selenoid_close",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="mini_front_door"
                className="flex items-center gap-2"
              >
                <DoorOpen className="h-4 w-4" />
                Front Door Pin
              </Label>
              <Input
                id="mini_front_door"
                type="number"
                min="1"
                max="6"
                value={config.relay_mini_front_door_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_mini_front_door_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="mini_back_door"
                className="flex items-center gap-2"
              >
                <DoorOpen className="h-4 w-4" />
                Back Door Pin
              </Label>
              <Input
                id="mini_back_door"
                type="number"
                min="1"
                max="6"
                value={config.relay_mini_back_door_pin}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_mini_back_door_pin",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="mini_emergency"
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Emergency Door Pin
              </Label>
              <Input
                id="mini_emergency"
                type="number"
                min="1"
                max="6"
                value={config.relay_mini_door_emergency}
                onChange={(e) =>
                  handleConfigChange(
                    "relay_mini_door_emergency",
                    parseInt(e.target.value) || 1
                  )
                }
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Pin Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">7</div>
              <div className="text-sm text-muted-foreground">
                Optocoupler Pins
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-sm text-muted-foreground">Relay Pins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">5</div>
              <div className="text-sm text-muted-foreground">
                Relay Mini Pins
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  validationErrors.length === 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {validationErrors.length === 0 ? "Valid" : "Errors"}
              </div>
              <div className="text-sm text-muted-foreground">Configuration</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
