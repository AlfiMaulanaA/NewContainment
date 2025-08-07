"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Swal from 'sweetalert2';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefreshCw, Save, Wifi, Loader2 } from "lucide-react";
import { useMQTT } from "@/lib/mqtt-manager";
import { CardSkeleton } from "@/components/loading-skeleton";

// MQTT Topics
const SNMP_SETTING_TOPIC_COMMAND = "IOT/Containment/snmp/setting/command";
const SNMP_SETTING_TOPIC_DATA = "IOT/Containment/snmp/setting/data";
const SNMP_STATUS_TOPIC = "IOT/Containment/snmp/status";
const SNMP_STATUS_COMMAND_TOPIC = "IOT/Containment/snmp/status/command";
const SERVICE_COMMAND_TOPIC = "service/command";
const SERVICE_RESPONSE_TOPIC = "service/response";

// Type Definitions
interface SnmpConfig {
  snmpIPaddress: string;
  snmpNetmask: string;
  snmpGateway: string;
  snmpVersion: string;
  authKey: string;
  privKey: string;
  securityName: string;
  securityLevel: string;
  snmpCommunity: string;
  snmpPort: string;
  sysOID: string;
  DeviceName: string;
  Site: string;
  snmpTrapEnabled: boolean;
  ipSnmpManager: string;
  portSnmpManager: string;
  snmpTrapComunity: string;
  snmpTrapVersion: string;
  timeDelaySnmpTrap: string;
}

interface SNMPConfigurationProps {
  isLoading?: boolean;
}

const SNMPConfiguration: React.FC<SNMPConfigurationProps> = ({ isLoading: parentLoading = false }) => {
  const [formData, setFormData] = useState<SnmpConfig>({
    snmpIPaddress: "",
    snmpNetmask: "",
    snmpGateway: "",
    snmpVersion: "3",
    authKey: "",
    privKey: "",
    securityName: "",
    securityLevel: "authPriv",
    snmpCommunity: "",
    snmpPort: "161",
    sysOID: "",
    DeviceName: "",
    Site: "",
    snmpTrapEnabled: true,
    ipSnmpManager: "",
    portSnmpManager: "162",
    snmpTrapComunity: "",
    snmpTrapVersion: "2",
    timeDelaySnmpTrap: "30",
  });

  const [snmpStatus, setSnmpStatus] = useState<string>("Unknown");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { subscribe, unsubscribe, publish, isConnected } = useMQTT();

  // Validation functions
  const { isValidIP, isValidNetmaskOptional } = useMemo(() => ({
    isValidIP: (ip: string) =>
      ip === "" || /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip),
    
    isValidNetmaskOptional: (mask: string) => {
      if (mask === "") return true;
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
    }
  }), []);

  const sendCommandRestartService = useCallback(async (serviceName: string, action: string, confirmMessage?: string): Promise<boolean> => {
    if (!isConnected()) {
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
      const payload = JSON.stringify({ services: [serviceName], action: action });
      const success = await publish(SERVICE_COMMAND_TOPIC, payload);
      
      if (!success) {
        toast.error("Failed to send command");
        setIsSaving(false);
      } else {
        toast.loading(`${action.toUpperCase()} ${serviceName} initiated...`, { id: "serviceCommand" });
      }
    }
    return proceed;
  }, [publish, isConnected]);

  const getConfig = useCallback(async () => {
    if (!isConnected()) {
      toast.warning("MQTT not connected. Cannot retrieve SNMP settings.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      const success = await publish(SNMP_SETTING_TOPIC_COMMAND, JSON.stringify({ command: "read" }));
      if (!success) {
        toast.error("Failed to request SNMP config");
        setIsLoading(false);
      } else {
        toast.info("Requesting SNMP settings...");
      }
    }, 300);
  }, [publish, isConnected]);

  const checkStatus = useCallback(async () => {
    if (!isConnected()) {
      toast.warning("MQTT not connected. Cannot check SNMP status.");
      return;
    }
    
    const success = await publish(SNMP_STATUS_COMMAND_TOPIC, JSON.stringify({ command: "check status" }));
    if (!success) {
      toast.error("Failed to request SNMP status");
    } else {
      toast.info("Checking SNMP service status...");
    }
  }, [publish, isConnected]);

  const writeConfig = useCallback(async () => {
    if (!isConnected()) {
      toast.error("MQTT client not connected. Cannot save configuration.");
      return;
    }

    // Validations
    if (formData.snmpIPaddress !== "" && !isValidIP(formData.snmpIPaddress)) {
        toast.error("Invalid SNMP IP Address format.");
        return;
    }
    if (formData.snmpNetmask !== "" && !isValidNetmaskOptional(formData.snmpNetmask)) {
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

    const payloadToSend = {
      command: "write",
      ...formData,
      snmpPort: parsedPort,
      portSnmpManager: parsedTrapPort,
      timeDelaySnmpTrap: parsedTimeDelay,
    };

    setIsSaving(true);
    toast.loading("Sending SNMP configuration...", { id: "snmpConfigSave" });

    const success = await publish(SNMP_SETTING_TOPIC_COMMAND, JSON.stringify(payloadToSend));
    if (!success) {
      toast.dismiss("snmpConfigSave");
      toast.error("Failed to send write command");
      setIsSaving(false);
    } else {
      toast.success("SNMP configuration sent to device.", { id: "snmpConfigSave" });
      const proceedRestart = await sendCommandRestartService("protocol_out.service", "restart", "SNMP settings updated. Do you want to restart the SNMP service to apply changes?");
      if (!proceedRestart) {
          setIsSaving(false);
      }
    }
  }, [formData, publish, isConnected, sendCommandRestartService, isValidIP, isValidNetmaskOptional]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleSelectChange = useCallback((name: keyof SnmpConfig, value: string) => {
    if (name === "snmpTrapEnabled") {
      setFormData((prev) => ({ ...prev, [name]: value === "true" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  // MQTT message handler
  useEffect(() => {
    if (parentLoading) return;

    const handleMessage = (topic: string, message: Buffer) => {
      try {
        const payload = JSON.parse(message.toString());

        if (topic === SNMP_SETTING_TOPIC_DATA) {
          const updatedFormData: SnmpConfig = {
            snmpIPaddress: payload.snmpIPaddress || "",
            snmpNetmask: payload.snmpNetmask || "",
            snmpGateway: payload.snmpGateway || "",
            snmpVersion: String(payload.snmpVersion || "3"),
            authKey: payload.authKey || "",
            privKey: payload.privKey || "",
            securityName: payload.securityName || "",
            securityLevel: String(payload.securityLevel || "authPriv"),
            snmpCommunity: payload.snmpCommunity || "",
            snmpPort: String(payload.snmpPort || "161"),
            sysOID: payload.sysOID || "",
            DeviceName: payload.DeviceName || "",
            Site: payload.Site || "",
            snmpTrapEnabled: typeof payload.snmpTrapEnabled === 'boolean' ? payload.snmpTrapEnabled : true,
            ipSnmpManager: payload.ipSnmpManager || "",
            portSnmpManager: String(payload.portSnmpManager || "162"),
            snmpTrapComunity: payload.snmpTrapComunity || "",
            snmpTrapVersion: String(payload.snmpTrapVersion || "2"),
            timeDelaySnmpTrap: String(payload.timeDelaySnmpTrap || "30"),
          };
          setFormData(updatedFormData);
          toast.success("SNMP settings loaded!");
          setIsLoading(false);
        } else if (topic === SNMP_STATUS_TOPIC) {
          setSnmpStatus(payload.snmpStatus || "Unknown");
        } else if (topic === SERVICE_RESPONSE_TOPIC) {
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
            if (payload.action === "restart" && Array.isArray(payload.services) && payload.services.includes("protocol_out.service")) {
                checkStatus();
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
        }
      } catch (e) {
        toast.error("Invalid response from MQTT. Check backend payload.");
        console.error("Error parsing MQTT message:", message.toString(), e);
        setIsLoading(false);
        setIsSaving(false);
      }
    };

    // Subscribe to topics
    const subscribeToTopics = async () => {
      await subscribe(SNMP_SETTING_TOPIC_DATA, handleMessage, "snmp-config");
      await subscribe(SNMP_STATUS_TOPIC, handleMessage, "snmp-config");
      await subscribe(SERVICE_RESPONSE_TOPIC, handleMessage, "snmp-config");

      // Request initial data
      if (isConnected()) {
        getConfig();
        checkStatus();
      }
    };

    subscribeToTopics();

    // Cleanup
    return () => {
      unsubscribe(SNMP_SETTING_TOPIC_DATA, "snmp-config");
      unsubscribe(SNMP_STATUS_TOPIC, "snmp-config");
      unsubscribe(SERVICE_RESPONSE_TOPIC, "snmp-config");
    };
  }, [subscribe, unsubscribe, getConfig, checkStatus, isConnected, parentLoading]);

  if (parentLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-md">SNMP Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading SNMP status...</span>
            </div>
          </CardContent>
        </Card>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-md">SNMP Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current Status: <strong className={snmpStatus === "RUNNING" ? "text-green-600" : "text-red-600"}>{snmpStatus}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-md">SNMP Configuration Details</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={getConfig} disabled={isSaving}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Get Config
              </Button>
              <Button variant="outline" size="sm" onClick={checkStatus} disabled={isSaving}>
                <Wifi className="w-4 h-4 mr-1" /> Check Status
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {/* Form Fields */}
          {Object.entries(formData).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const inputType = typeof value === "number" ? "number" : "text";

            const isIpField = ["snmpIPaddress", "snmpGateway", "ipSnmpManager"].includes(key);
            const isNetmaskField = key === "snmpNetmask";
            const showIpError = isIpField && value !== "" && !isValidIP(String(value));
            const showNetmaskError = isNetmaskField && value !== "" && !isValidNetmaskOptional(String(value));

            // Handle Select fields
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

            // Handle regular Input fields
            return (
              <div key={key} className="flex flex-col gap-1">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  name={key}
                  type={inputType}
                  value={String(value)}
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
          <div className="col-span-full">
            <Button className="w-full" onClick={writeConfig} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(SNMPConfiguration);