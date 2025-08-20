"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner"; // Import toast for notifications
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added CardHeader, CardTitle
import Swal from 'sweetalert2'; // Import SweetAlert2 for confirmation dialogs
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { RefreshCw, Save, Settings2, Wifi, Loader2, CheckCircle2, XCircle, Activity } from "lucide-react";
import { mqttClient } from "@/lib/mqtt";
import MqttStatus from "@/components/mqtt-status";

// --- MQTT Topics ---
const SNMP_SETTING_TOPIC_COMMAND = "IOT/Containment/snmp/setting/command";
const SNMP_SETTING_TOPIC_DATA = "IOT/Containment/snmp/setting/data";
const SNMP_STATUS_TOPIC = "IOT/Containment/snmp/status";
const SNMP_STATUS_COMMAND_TOPIC = "IOT/Containment/snmp/status/command";
const SERVICE_COMMAND_TOPIC = "service/command";
const SERVICE_RESPONSE_TOPIC = "service/response";

// --- Type Definitions ---
interface SnmpConfig {
  snmpIPaddress: string;
  snmpNetmask: string;
  snmpGateway: string;
  snmpVersion: string; // Ensure this is string
  authKey: string;
  privKey: string;
  securityName: string;
  securityLevel: string; // Ensure this is string
  snmpCommunity: string;
  snmpPort: string; // Kept as string for initial input handling
  sysOID: string;
  DeviceName: string;
  Site: string;
  snmpTrapEnabled: boolean;
  ipSnmpManager: string;
  portSnmpManager: string; // Kept as string for initial input handling
  snmpTrapComunity: string;
  snmpTrapVersion: string; // Ensure this is string
  timeDelaySnmpTrap: string; // Kept as string for initial input handling
}

export default function SNMPSettingPage() {
  // --- State Variables ---
  const [formData, setFormData] = useState<SnmpConfig>({
    snmpIPaddress: "",
    snmpNetmask: "",
    snmpGateway: "",
    snmpVersion: "3", // Default to SNMPv3 (string)
    authKey: "",
    privKey: "",
    securityName: "",
    securityLevel: "authPriv", // Default to authPriv (string)
    snmpCommunity: "",
    snmpPort: "161", // Default to 161 (string)
    sysOID: "",
    DeviceName: "",
    Site: "",
    snmpTrapEnabled: true,
    ipSnmpManager: "",
    portSnmpManager: "162", // Default to 162 (string)
    snmpTrapComunity: "",
    snmpTrapVersion: "2", // Default to SNMP Trap v2 (string)
    timeDelaySnmpTrap: "30", // Default to 30 (string)
  });

  const [snmpStatus, setSnmpStatus] = useState<string>("Unknown");
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
  const [isSaving, setIsSaving] = useState(false); // New state for save operation
  const [isConnected, setIsConnected] = useState(false); // MQTT connection status

  // --- Utility Functions ---

  /**
   * Helper function for IP address validation.
   */
  const isValidIP = (ip: string) =>
    ip === "" || /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip);

  /**
   * Helper function for Netmask validation.
   */
  const isValidNetmask = (mask: string) => {
    if (mask === "") return true; // Allow empty string for optional fields
    const parts = mask.split('.').map(Number);
    if (parts.length !== 4) return false;
    if (parts.some(p => p < 0 || p > 255)) return false;

    // Common valid netmasks
    const validMasks = [
      "255.255.255.255", "255.255.255.254", "255.255.255.252", "255.255.255.248",
      "255.255.255.240", "255.255.255.224", "255.255.255.192", "255.255.255.128",
      "255.255.255.0", "255.255.254.0", "255.255.252.0", "255.255.248.0",
      "255.255.240.0", "255.255.224.0", "255.255.192.0", "255.255.128.0",
      "255.255.0.0", "255.254.0.0", "255.252.0.0", "255.248.0.0",
      "255.240.0.0", "255.224.0.0", "255.192.0.0", "255.128.0.0", "255.0.0.0",
      "0.0.0.0"
    ];
    return validMasks.includes(mask);
  };

  /**
   * Sends a command (restart, stop, start) to a specific service via MQTT.
   * Includes a SweetAlert2 confirmation dialog.
   * @param serviceName The name of the service to command (e.g., "protocol_out.service").
   * @param action The action to perform ("restart", "stop", "start").
   * @param confirmMessage Optional message for the confirmation dialog.
   * @returns Promise<boolean> indicating if the command was proceeded (after confirmation)
   */
  const sendCommandRestartService = useCallback(async (serviceName: string, action: string, confirmMessage?: string): Promise<boolean> => {
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

  /**
   * Requests the current SNMP settings from the backend via MQTT.
   */
  const getConfig = useCallback(async () => {
    if (!isConnected) {
      toast.warning("MQTT not connected. Cannot retrieve SNMP settings.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    toast.info("Requesting SNMP settings...");
    
    try {
      const success = await mqttClient.publish(
        SNMP_SETTING_TOPIC_COMMAND, 
        JSON.stringify({ command: "read" })
      );
      
      if (!success) {
        toast.error("Failed to request SNMP settings");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error requesting SNMP settings:", error);
      toast.error("Failed to request SNMP settings");
      setIsLoading(false);
    }
  }, [isConnected]);

  /**
   * Requests the current SNMP service status from the backend via MQTT.
   */
  const checkStatus = useCallback(async () => {
    if (!isConnected) {
      toast.warning("MQTT not connected. Cannot check SNMP status.");
      return;
    }
    
    try {
      const success = await mqttClient.publish(
        SNMP_STATUS_COMMAND_TOPIC, 
        JSON.stringify({ command: "check status" })
      );
      
      if (success) {
        toast.info("Checking SNMP service status...");
      } else {
        toast.error("Failed to request SNMP status");
      }
    } catch (error) {
      console.error("Error checking SNMP status:", error);
      toast.error("Failed to request SNMP status");
    }
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
          toast.success("MQTT Connected for SNMP settings. Fetching data...");
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
    const handleSnmpSettingData = (topic: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        console.log(`Received SNMP settings:`, payload);
        
        // Ensure all incoming data is correctly mapped and converted to string for Select components
        const updatedFormData: SnmpConfig = {
          snmpIPaddress: payload.snmpIPaddress || "",
          snmpNetmask: payload.snmpNetmask || "",
          snmpGateway: payload.snmpGateway || "",
          snmpVersion: String(payload.snmpVersion || "3"), // Explicitly convert to string
          authKey: payload.authKey || "",
          privKey: payload.privKey || "",
          securityName: payload.securityName || "",
          securityLevel: String(payload.securityLevel || "authPriv"), // Explicitly convert to string
          snmpCommunity: payload.snmpCommunity || "",
          snmpPort: String(payload.snmpPort || "161"), // Explicitly convert to string
          sysOID: payload.sysOID || "",
          DeviceName: payload.DeviceName || "",
          Site: payload.Site || "",
          snmpTrapEnabled: typeof payload.snmpTrapEnabled === 'boolean' ? payload.snmpTrapEnabled : true,
          ipSnmpManager: payload.ipSnmpManager || "",
          portSnmpManager: String(payload.portSnmpManager || "162"), // Explicitly convert to string
          snmpTrapComunity: payload.snmpTrapComunity || "",
          snmpTrapVersion: String(payload.snmpTrapVersion || "2"), // Explicitly convert to string
          timeDelaySnmpTrap: String(payload.timeDelaySnmpTrap || "30"), // Explicitly convert to string
        };
        setFormData(updatedFormData);
        toast.success("SNMP settings loaded! 🎉");
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing SNMP settings data:", error);
        toast.error("Failed to parse SNMP settings data");
        setIsLoading(false);
      }
    };

    const handleSnmpStatus = (topic: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        setSnmpStatus(payload.snmpStatus || "Unknown");
        toast.info(`SNMP Status: ${payload.snmpStatus || "Unknown"}`);
      } catch (error) {
        console.error("Error parsing SNMP status:", error);
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
            title: payload.message || 'Service command executed successfully!',
            showConfirmButton: false,
            timer: 3000,
            toast: true
          });
          
          // After a successful service restart, re-check SNMP status
          if (payload.action === "restart" && Array.isArray(payload.services) && payload.services.includes("protocol_out.service")) {
            setTimeout(() => {
              checkStatus(); // Re-check SNMP status
            }, 1000);
          }
        } else {
          Swal.fire({
            position: 'top-end',
            icon: 'error',
            title: payload.message || 'Failed to execute service command.',
            showConfirmButton: false,
            timer: 3000,
            toast: true
          });
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
        await mqttClient.subscribe(SNMP_SETTING_TOPIC_DATA, handleSnmpSettingData);
        await mqttClient.subscribe(SNMP_STATUS_TOPIC, handleSnmpStatus);
        await mqttClient.subscribe(SERVICE_RESPONSE_TOPIC, handleServiceResponse);
        
        mqttClient.addConnectionListener(handleConnectionChange);
        
        // Fetch initial settings and status if connected
        if (mqttClient.isConnected()) {
          getConfig();
          checkStatus();
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
      mqttClient.unsubscribe(SNMP_SETTING_TOPIC_DATA, handleSnmpSettingData);
      mqttClient.unsubscribe(SNMP_STATUS_TOPIC, handleSnmpStatus);
      mqttClient.unsubscribe(SERVICE_RESPONSE_TOPIC, handleServiceResponse);
      mqttClient.removeConnectionListener(handleConnectionChange);
    };
  }, []); // Empty dependency array to avoid infinite loops

  // --- Event Handlers for Form Inputs ---

  /**
   * Handles changes for text and number input fields.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /**
   * Handles changes for Select (dropdown) components.
   * Converts string "true"/"false" for boolean selects.
   */
  const handleSelectChange = (name: keyof SnmpConfig, value: string) => {
    if (name === "snmpTrapEnabled") {
      setFormData((prev) => ({ ...prev, [name]: value === "true" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Handles saving the SNMP configuration.
   * Validates input, publishes to MQTT, and then triggers a service restart.
   */
  const writeConfig = async () => {
    if (!isConnected) {
      toast.error("MQTT client not connected. Cannot save configuration. 😔");
      return;
    }

    // --- Input Validations ---
    // Validate IP addresses and Netmask only if they are not empty
    if (formData.snmpIPaddress !== "" && !isValidIP(formData.snmpIPaddress)) {
        toast.error("Invalid SNMP IP Address format.");
        return;
    }
    if (formData.snmpNetmask !== "" && !isValidNetmask(formData.snmpNetmask)) {
        toast.error("Invalid SNMP Netmask format.");
        return;
    }
    if (formData.snmpGateway !== "" && !isValidIP(formData.snmpGateway)) {
        toast.error("Invalid SNMP Gateway IP Address format.");
        return;
    }
    if (formData.ipSnmpManager !== "" && !isValidIP(formData.ipSnmpManager)) {
        toast.error("Invalid SNMP Manager IP Address format.");
        return;
    }

    const parsedPort = parseInt(formData.snmpPort, 10);
    const parsedTrapPort = parseInt(formData.portSnmpManager, 10);
    const parsedTimeDelay = parseInt(formData.timeDelaySnmpTrap, 10);

    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      toast.error("Invalid SNMP Port. Must be between 1 and 65535.");
      return;
    }
    if (isNaN(parsedTrapPort) || parsedTrapPort <= 0 || parsedTrapPort > 65535) {
      toast.error("Invalid SNMP Trap Manager Port. Must be between 1 and 65535.");
      return;
    }
    if (isNaN(parsedTimeDelay) || parsedTimeDelay <= 0) {
      toast.error("Invalid Time Delay for SNMP Trap. Must be a positive number.");
      return;
    }

    // Prepare payload to send to backend (convert numbers back from string)
    const payloadToSend = {
      command: "write",
      ...formData,
      snmpPort: parsedPort,
      portSnmpManager: parsedTrapPort,
      timeDelaySnmpTrap: parsedTimeDelay,
    };

    setIsSaving(true);
    toast.loading("Configuration sent. Verifying update...", { id: "snmpConfigSave" });

    try {
      const success = await mqttClient.publish(SNMP_SETTING_TOPIC_COMMAND, JSON.stringify(payloadToSend));
      
      if (success) {
        toast.dismiss("snmpConfigSave");
        toast.success("SNMP configuration sent to device.");
        
        // Ask for confirmation to restart service after successful config write
        const proceedRestart = await sendCommandRestartService(
          "protocol_out.service", 
          "restart", 
          "SNMP settings updated. Do you want to restart the SNMP service to apply changes?"
        );
        if (!proceedRestart) {
          setIsSaving(false); // If user cancels restart, stop saving state
        }
        // If proceedRestart is true, setIsSaving will be handled by SERVICE_RESPONSE_TOPIC listener
      } else {
        toast.dismiss("snmpConfigSave");
        toast.error("Failed to send SNMP configuration");
        setIsSaving(false);
      }
    } catch (error) {
      console.error("Error sending SNMP configuration:", error);
      toast.dismiss("snmpConfigSave");
      toast.error("Failed to send SNMP configuration");
      setIsSaving(false);
    }
  };

  // --- Rendered Component (JSX) ---
  return (
    <SidebarInset>
      {/* Header Section */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Settings2 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">SNMP Communication</h1>
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
          <Button variant="outline" size="sm" onClick={getConfig} disabled={isLoading || isSaving || !isConnected}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Get Config
          </Button>
          <Button variant="outline" size="sm" onClick={checkStatus} disabled={isLoading || isSaving || !isConnected}>
            <Wifi className="w-4 h-4 mr-1" /> Check Status
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-4">
        <Card className="border-2 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              SNMP Service Status
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time status of SNMP communication service
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${snmpStatus === "RUNNING" ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm font-medium">Service Status:</span>
              <strong className={`${snmpStatus === "RUNNING" ? "text-green-600" : "text-red-600"}`}>
                {snmpStatus}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              SNMP Configuration Details
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure SNMP settings including authentication, encryption, and network parameters
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Loading State */}
            {isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <span className="text-lg text-blue-500">Loading SNMP Settings...</span>
                <p className="text-sm text-muted-foreground mt-2">Please ensure MQTT is connected and backend is running.</p>
              </div>
            )}

            {/* Form Fields (rendered dynamically based on formData) */}
            {!isLoading && Object.entries(formData).map(([key, value]) => {
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              const inputType = typeof value === "number" ? "number" : "text"; // Determine input type for non-selects

              // Determine if it's an IP/Netmask field for validation feedback
              const isIpField = ["snmpIPaddress", "snmpGateway", "ipSnmpManager"].includes(key);
              const isNetmaskField = key === "snmpNetmask";
              const showIpError = isIpField && value !== "" && !isValidIP(String(value));
              const showNetmaskError = isNetmaskField && value !== "" && !isValidNetmask(String(value));

              // Handle Select (dropdown) fields
              if (["snmpVersion", "securityLevel", "snmpTrapVersion", "snmpTrapEnabled"].includes(key)) {
                let options: { value: string; label: string }[] = [];
                if (key === "snmpVersion") {
                  options = [{ value: "1", label: "1" }, { value: "2c", label: "2c" }, { value: "3", label: "3" }];
                } else if (key === "securityLevel") {
                  options = [
                    { value: "noAuthNoPriv", label: "No Auth, No Priv" },
                    { value: "authNoPriv", label: "Auth, No Priv" },
                    { value: "authPriv", label: "Auth, Priv" }
                  ];
                } else if (key === "snmpTrapVersion") {
                  options = [{ value: "1", label: "1" }, { value: "2c", label: "2c" }];
                } else if (key === "snmpTrapEnabled") {
                  options = [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }];
                }

                return (
                  <div key={key} className="flex flex-col gap-1">
                    <Label htmlFor={key}>{label}</Label>
                    <Select value={String(value)} onValueChange={(val) => handleSelectChange(key as keyof SnmpConfig, val)} disabled={isSaving}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              // Handle regular Input fields (text or number)
              return (
                <div key={key} className="flex flex-col gap-1">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    name={key}
                    type={inputType}
                    value={String(value)} // Ensure value is always a string for Input component
                    onChange={handleChange}
                    className={(showIpError || showNetmaskError) ? "border-red-500 focus-visible:ring-red-500" : ""}
                    disabled={isSaving}
                  />
                  {showIpError && (
                      <p className="text-xs text-red-500 mt-1">Invalid IP Address format (e.g., 192.168.1.1).</p>
                  )}
                  {showNetmaskError && (
                      <p className="text-xs text-red-500 mt-1">Invalid Netmask format (e.g., 255.255.255.0).</p>
                  )}
                </div>
              );
            })}

            {/* Save Button */}
            {!isLoading && (
              <div className="col-span-full space-y-3">
                <Button className="w-full" onClick={writeConfig} disabled={isSaving || !isConnected}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Config
                </Button>
                
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}