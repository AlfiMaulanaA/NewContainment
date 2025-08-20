"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, RefreshCw, Save, CheckCircle2, XCircle, Loader2, AlertTriangle, Settings } from "lucide-react";
import { mqttClient } from "@/lib/mqtt";
import MqttStatus from "@/components/mqtt-status";
import { toast } from "sonner";
import Swal from 'sweetalert2';

// --- MQTT Topics ---
const MODBUS_SETTING_COMMAND_TOPIC = "IOT/Containment/modbustcp/setting/command";
const MODBUS_SETTING_DATA_TOPIC = "IOT/Containment/modbustcp/setting/data";
const MODBUS_STATUS_TOPIC = "IOT/Containment/modbustcp/status";
const SERVICE_COMMAND_TOPIC = "service/command";
const SERVICE_RESPONSE_TOPIC = "service/response"; // Topic to receive service command responses

export default function ModbusTCPSettingsPage() {
  // --- State Variables ---
  const [modbusIP, setModbusIP] = useState(""); // Current IP from backend
  const [modbusPort, setModbusPort] = useState(""); // Current Port from backend
  const [inputIP, setInputIP] = useState(""); // User input for IP
  const [inputPort, setInputPort] = useState(""); // User input for Port
  const [modbusStatus, setModbusStatus] = useState("Unknown"); // Status of Modbus TCP service
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial data fetch and config save
  const [isConnected, setIsConnected] = useState(false); // MQTT connection status
  const [isSaving, setIsSaving] = useState(false); // Save operation status

  // --- Utility Functions ---

  /**
   * Requests the current Modbus TCP settings from the backend via MQTT.
   */
  const getCurrentSetting = useCallback(async () => {
    if (!isConnected) {
      toast.warning("MQTT not connected. Cannot retrieve settings.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    toast.info("Requesting Modbus TCP settings...");
    
    try {
      const success = await mqttClient.publish(
        MODBUS_SETTING_COMMAND_TOPIC, 
        JSON.stringify({ command: "read" })
      );
      
      if (!success) {
        toast.error("Failed to request settings");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error requesting settings:", error);
      toast.error("Failed to request settings");
      setIsLoading(false);
    }
  }, [isConnected]);

  /**
   * Sends a command (restart, stop, start) to a specific service via MQTT.
   * Includes a SweetAlert2 confirmation dialog.
   * @param serviceName The name of the service to command (e.g., "protocol_out.service").
   * @param action The action to perform ("restart", "stop", "start").
   * @param confirmMessage Optional message for the confirmation dialog.
   */
  const sendCommandRestartService = useCallback(async (serviceName: string, action: string, confirmMessage?: string) => {
    if (!isConnected) {
      toast.error("MQTT not connected. Please wait for connection or refresh.");
      return false;
    }

    let proceed = true;
    if (confirmMessage) {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: confirmMessage,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, proceed!'
      });

      if (!result.isConfirmed) {
        proceed = false;
        toast.info("Action cancelled.");
      }
    }

    if (proceed) {
      setIsSaving(true);
      toast.loading(`${action.toUpperCase()} ${serviceName} initiated...`, { id: "serviceCommand" });
      
      try {
        const payload = JSON.stringify({ services: [serviceName], action: action });
        const success = await mqttClient.publish(SERVICE_COMMAND_TOPIC, payload);
        
        if (!success) {
          toast.dismiss("serviceCommand");
          toast.error("Failed to send service command");
          setIsSaving(false);
        }
        return success;
      } catch (error) {
        console.error("Error sending service command:", error);
        toast.dismiss("serviceCommand");
        toast.error("Failed to send service command");
        setIsSaving(false);
        return false;
      }
    }
    return false;
  }, [isConnected]);

  // --- useEffect for MQTT Connection and Message Handling ---
  useEffect(() => {
    let isSubscribed = true;

    const initializeMqtt = async () => {
      try {
        // Connect to MQTT broker
        await mqttClient.connect();
        
        if (isSubscribed) {
          setIsConnected(true);
          toast.success("MQTT Connected for Modbus TCP settings. Fetching data...");
        }
      } catch (error) {
        console.error("MQTT connection error:", error);
        if (isSubscribed) {
          setIsConnected(false);
          toast.error("MQTT connection error. Please check broker settings.");
          setIsLoading(false);
        }
      }
    };

    // Message handlers for different topics
    const handleModbusSettingData = (topic: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        const { modbus_tcp_ip, modbus_tcp_port } = payload;
        
        setModbusIP(modbus_tcp_ip || "");
        setModbusPort(String(modbus_tcp_port || ""));

        // Only update input fields if they are empty or match the current displayed backend values
        if (inputIP === "" || inputIP === modbus_tcp_ip) {
          setInputIP(modbus_tcp_ip || "");
        }
        if (inputPort === "" || String(inputPort) === String(modbus_tcp_port)) {
          setInputPort(String(modbus_tcp_port || ""));
        }
        
        toast.success("Modbus TCP settings loaded! 🎉");
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing Modbus settings data:", error);
        toast.error("Failed to parse Modbus settings data");
        setIsLoading(false);
      }
    };

    const handleModbusStatus = (topic: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        setModbusStatus(payload.modbusTCPStatus || "Unknown");
      } catch (error) {
        console.error("Error parsing Modbus status:", error);
      }
    };

    const handleServiceResponse = (topic: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        
        toast.dismiss("serviceCommand");
        setIsSaving(false);

        if (payload.result === "success") {
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: payload.message || 'Command executed successfully.',
            showConfirmButton: false,
            timer: 3000,
            toast: true
          });
          
          // If the restarted service is protocol_out.service, re-fetch settings
          if (Array.isArray(payload.services) && payload.services.includes("protocol_out.service")) {
            setTimeout(() => {
              getCurrentSetting(); // Refresh settings after service restart
            }, 1000);
          }
        } else {
          Swal.fire({
            position: 'top-end',
            icon: 'error',
            title: 'Error!',
            text: payload.message || 'Command failed.',
            showConfirmButton: false,
            timer: 3000,
            toast: true
          });
          console.error("Service command error response:", payload);
        }
      } catch (error) {
        console.error("Error parsing service response:", error);
        toast.dismiss("serviceCommand");
        setIsSaving(false);
        toast.error("Failed to parse service response");
      }
    };

    // Connection status listener
    const handleConnectionChange = (connected: boolean) => {
      if (isSubscribed) {
        setIsConnected(connected);
        if (!connected) {
          setIsLoading(false);
          setIsSaving(false);
        }
      }
    };

    // Subscribe to topics and set up listeners
    const setupSubscriptions = async () => {
      try {
        await mqttClient.subscribe(MODBUS_SETTING_DATA_TOPIC, handleModbusSettingData);
        await mqttClient.subscribe(MODBUS_STATUS_TOPIC, handleModbusStatus);
        await mqttClient.subscribe(SERVICE_RESPONSE_TOPIC, handleServiceResponse);
        
        mqttClient.addConnectionListener(handleConnectionChange);
        
        // Fetch initial settings if connected
        if (mqttClient.isConnected()) {
          getCurrentSetting();
        }
      } catch (error) {
        console.error("Error setting up MQTT subscriptions:", error);
        if (isSubscribed) {
          setIsLoading(false);
          toast.error("Failed to set up MQTT subscriptions");
        }
      }
    };

    // Initialize MQTT connection and subscriptions
    initializeMqtt().then(() => {
      if (isSubscribed) {
        setupSubscriptions();
      }
    });

    // Cleanup function
    return () => {
      isSubscribed = false;
      // Unsubscribe from topics
      mqttClient.unsubscribe(MODBUS_SETTING_DATA_TOPIC, handleModbusSettingData);
      mqttClient.unsubscribe(MODBUS_STATUS_TOPIC, handleModbusStatus);
      mqttClient.unsubscribe(SERVICE_RESPONSE_TOPIC, handleServiceResponse);
      mqttClient.removeConnectionListener(handleConnectionChange);
    };
  }, []); // Empty dependency array to avoid infinite loops

  /**
   * Handles saving the Modbus TCP configuration.
   * Validates input, publishes to MQTT, and triggers a service restart.
   */
  const writeSetting = async () => {
    if (!isConnected) {
      toast.error("MQTT client not connected. Cannot save configuration. 😔");
      return;
    }

    const parsedPort = parseInt(inputPort, 10);
    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      toast.error("Invalid port number. Port must be a number between 1 and 65535.");
      return;
    }

    const payload = {
      command: "write",
      modbus_tcp_ip: inputIP,
      modbus_tcp_port: parsedPort,
    };

    setIsSaving(true);
    toast.loading("Configuration sent. Verifying update...", { id: "writeConfigLoading" });

    try {
      const success = await mqttClient.publish(MODBUS_SETTING_COMMAND_TOPIC, JSON.stringify(payload));
      
      if (success) {
        toast.dismiss("writeConfigLoading");
        toast.success("Configuration sent successfully!");
        
        // After sending config, prompt user to restart service to apply changes
        await sendCommandRestartService(
          "protocol_out.service", 
          "restart", 
          "Modbus TCP settings updated. Do you want to restart the Modbus TCP service to apply changes?"
        );
      } else {
        toast.dismiss("writeConfigLoading");
        toast.error("Failed to send write command");
        setIsSaving(false);
      }
    } catch (error) {
      console.error("Error sending write command:", error);
      toast.dismiss("writeConfigLoading");
      toast.error("Failed to send write command");
      setIsSaving(false);
    }
  };

  /**
   * Renders the status message for configuration matching.
   */
  const renderStatusConfig = () => {
    // Check if the user's current input matches the configuration received from the backend
    const currentInputMatchesBackend = inputIP === modbusIP && String(inputPort) === modbusPort;

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading configuration...</span>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4" />
          <span>MQTT disconnected. Cannot load configuration.</span>
        </div>
      );
    }
    
    // If backend data exists and matches current input
    if (modbusIP && modbusPort && currentInputMatchesBackend) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuration synchronized.</span>
        </div>
      );
    }
    
    // If backend data exists but doesn't match current input
    if (modbusIP || modbusPort) { 
        if (!currentInputMatchesBackend) {
            return (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Configuration changes pending. Save to apply.</span>
                </div>
              );
        }
    }

    // If no backend data loaded and not in a loading state
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Settings className="w-4 h-4" />
        <span>No configuration loaded yet.</span>
      </div>
    );
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Network className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Containment Modbus TCP Configuration</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium">
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-green-700">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-red-600" />
                <span className="text-red-700">Disconnected</span>
              </>
            )}
          </div>
          <MqttStatus />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={getCurrentSetting} 
            disabled={isLoading || isSaving || !isConnected}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Get Current Setting
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Current Configuration Card */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Current Configuration
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Current Modbus TCP settings loaded from device
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Modbus IP Address</label>
              <Input 
                value={modbusIP} 
                readOnly 
                placeholder={isLoading ? "Loading..." : "Not configured"} 
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Modbus Port</label>
              <Input 
                value={modbusPort} 
                readOnly 
                placeholder={isLoading ? "Loading..." : "Not configured"} 
                className="bg-gray-50 border-gray-200"
              />
            </div>
            
            {/* Status Section */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Service Status</label>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  modbusStatus === "RUNNING" 
                    ? "bg-green-100 text-green-800 border border-green-200" 
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}>
                  {modbusStatus}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-slate-50 border">
                {renderStatusConfig()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Update Configuration Card */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-green-600" />
              Update Configuration
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Modify Modbus TCP settings and apply changes to device
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Modbus IP Address</label>
              <Input 
                value={inputIP} 
                onChange={(e) => setInputIP(e.target.value)} 
                placeholder="192.168.0.179" 
                disabled={isLoading || isSaving || !isConnected}
                className={!isConnected ? "bg-gray-100" : ""}
              />
              <p className="text-xs text-gray-600">
                IP address of the Modbus TCP device
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Modbus Port</label>
              <Input 
                value={inputPort} 
                onChange={(e) => setInputPort(e.target.value)} 
                placeholder="502" 
                type="number"
                min="1"
                max="65535"
                disabled={isLoading || isSaving || !isConnected}
                className={!isConnected ? "bg-gray-100" : ""}
              />
              <p className="text-xs text-gray-600">
                Port number (1-65535), default is 502
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="pt-3 space-y-3 border-t border-gray-200">
              <Button 
                className="w-full h-11 font-semibold" 
                onClick={writeSetting} 
                disabled={isLoading || isSaving || !isConnected || (!inputIP || !inputPort)}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
              
              {/* Restart Service Button */}
              <Button
                className="w-full h-10"
                variant="outline"
                onClick={() => sendCommandRestartService(
                  "protocol_out.service", 
                  "restart", 
                  "This will restart the Modbus TCP service. Any ongoing communication will be interrupted. Are you sure?"
                )}
                disabled={isLoading || isSaving || !isConnected || !modbusIP}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Restart Modbus TCP Service
              </Button>
            </div>

            {/* Connection Warning */}
            {!isConnected && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">MQTT Not Connected</span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Cannot save configuration. Please check MQTT connection.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}