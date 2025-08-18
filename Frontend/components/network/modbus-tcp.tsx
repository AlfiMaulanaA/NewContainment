"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Swal from 'sweetalert2';
import { useMQTT } from "@/hooks/useMQTT";
import { CardSkeleton } from "@/components/loading-skeleton";

// MQTT Topics
const MODBUS_SETTING_COMMAND_TOPIC = "IOT/Containment/modbustcp/setting/command";
const MODBUS_SETTING_DATA_TOPIC = "IOT/Containment/modbustcp/setting/data";
const MODBUS_STATUS_TOPIC = "IOT/Containment/modbustcp/status";
const SERVICE_COMMAND_TOPIC = "service/command";
const SERVICE_RESPONSE_TOPIC = "service/response";

interface ModbusTCPProps {
  isLoading?: boolean;
}

const ModbusTCP: React.FC<ModbusTCPProps> = ({ isLoading: parentLoading = false }) => {
  const [modbusIP, setModbusIP] = useState("");
  const [modbusPort, setModbusPort] = useState("");
  const [inputIP, setInputIP] = useState("");
  const [inputPort, setInputPort] = useState("");
  const [modbusStatus, setModbusStatus] = useState("Unknown");
  const [isLoading, setIsLoading] = useState(true);
  
  const { subscribe, unsubscribe, publish, isConnected } = useMQTT();

  const getCurrentSetting = useCallback(async () => {
    if (!isConnected) {
      toast.warning("MQTT not connected. Cannot retrieve Modbus settings.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const success = await publish(MODBUS_SETTING_COMMAND_TOPIC, JSON.stringify({ command: "read" }));
    
    if (!success) {
      toast.error("Failed to request Modbus settings");
      setIsLoading(false);
    } else {
      toast.info("Requesting Modbus TCP settings...");
    }
  }, [publish, isConnected]);

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
      const payload = JSON.stringify({ services: [serviceName], action: action });
      const success = await publish(SERVICE_COMMAND_TOPIC, payload);
      
      if (!success) {
        toast.error("Failed to send command");
      } else {
        toast.loading(`${action.toUpperCase()} ${serviceName} initiated...`, { id: "serviceCommand" });
      }
    }
    return proceed;
  }, [publish, isConnected]);

  const writeSetting = useCallback(async () => {
    if (!isConnected) {
      toast.error("MQTT client not connected. Cannot save configuration.");
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

    setIsLoading(true);
    const success = await publish(MODBUS_SETTING_COMMAND_TOPIC, JSON.stringify(payload));
    
    if (!success) {
      toast.error("Failed to send write command");
      setIsLoading(false);
    } else {
      toast.loading("Configuration sent. Verifying update...", { id: "writeConfigLoading" });
      sendCommandRestartService("protocol_out.service", "restart", "Modbus TCP settings updated. Do you want to restart the Modbus TCP service to apply changes?");
    }
  }, [inputIP, inputPort, publish, isConnected, sendCommandRestartService]);

  const renderStatusConfig = useMemo(() => {
    const currentInputMatchesBackend = inputIP === modbusIP && String(inputPort) === modbusPort;

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading configuration...</span>
        </div>
      );
    }
    
    if (modbusIP && modbusPort && currentInputMatchesBackend) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuration matched.</span>
        </div>
      );
    }
    
    if (modbusIP || modbusPort) { 
        if (!currentInputMatchesBackend) {
            return (
                <div className="flex items-center gap-2 text-yellow-600">
                  <XCircle className="w-4 h-4" />
                  <span>Config mismatch. Save to apply changes.</span>
                </div>
              );
        }
    }

    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>No configuration loaded yet.</span>
      </div>
    );
  }, [isLoading, inputIP, modbusIP, inputPort, modbusPort]);

  // MQTT message handler
  useEffect(() => {
    if (parentLoading) return;

    const handleMessage = (topic: string, message: string) => {
      try {
        const payload = JSON.parse(message);

        if (topic === MODBUS_SETTING_DATA_TOPIC) {
          const { modbus_tcp_ip, modbus_tcp_port } = payload;
          setModbusIP(modbus_tcp_ip || "");
          setModbusPort(String(modbus_tcp_port || ""));

          if (inputIP === "" || inputIP === modbus_tcp_ip) {
            setInputIP(modbus_tcp_ip || "");
          }
          if (inputPort === "" || String(inputPort) === String(modbus_tcp_port)) {
            setInputPort(String(modbus_tcp_port || ""));
          }
          toast.success("Modbus TCP settings loaded!");
          setIsLoading(false);
        } else if (topic === MODBUS_STATUS_TOPIC) {
          setModbusStatus(payload.modbusTCPStatus || "Unknown");
        } else if (topic === SERVICE_RESPONSE_TOPIC) {
          toast.dismiss("serviceCommand");

          if (payload.result === "success") {
            Swal.fire({
              position: 'top-end',
              icon: 'success',
              title: payload.message || 'Command executed successfully.',
              showConfirmButton: false,
              timer: 3000,
              toast: true
            });
            if (Array.isArray(payload.services) && payload.services.includes("protocol_out.service")) {
              setTimeout(() => {
                getCurrentSetting();
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
          }
        }
      } catch (e) {
        toast.error("Invalid response from MQTT. Check backend payload.");
        console.error("Error parsing MQTT message:", message.toString(), e);
        setIsLoading(false);
      }
    };

    // Subscribe to topics
    const subscribeToTopics = async () => {
      await subscribe(MODBUS_SETTING_DATA_TOPIC, handleMessage, "modbus-tcp");
      await subscribe(MODBUS_STATUS_TOPIC, handleMessage, "modbus-tcp");  
      await subscribe(SERVICE_RESPONSE_TOPIC, handleMessage, "modbus-tcp");

      // Request initial data
      if (isConnected) {
        getCurrentSetting();
      }
    };

    subscribeToTopics();

    // Cleanup
    return () => {
      unsubscribe(MODBUS_SETTING_DATA_TOPIC, "modbus-tcp");
      unsubscribe(MODBUS_STATUS_TOPIC, "modbus-tcp");
      unsubscribe(SERVICE_RESPONSE_TOPIC, "modbus-tcp");
    };
  }, [subscribe, unsubscribe, getCurrentSetting, isConnected, parentLoading, inputIP, inputPort]);

  if (parentLoading || isLoading) {
    return <CardSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Current Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <label className="text-sm font-medium">Modbus IP</label>
            <Input value={modbusIP} readOnly placeholder="N/A" />
          </div>
          <div>
            <label className="text-sm font-medium">Modbus Port</label>
            <Input value={modbusPort} readOnly placeholder="N/A" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Modbus Status</label>
            <span className="text-sm">{modbusStatus}</span>
          </div>
          {renderStatusConfig}
        </CardContent>
      </Card>

      {/* Update Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Update Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <label className="text-sm font-medium">Modbus IP</label>
            <Input 
              value={inputIP} 
              onChange={(e) => setInputIP(e.target.value)} 
              placeholder="192.168.0.179" 
            />
          </div>
          <div>
            <label className="text-sm font-medium">Modbus Port</label>
            <Input 
              value={inputPort} 
              onChange={(e) => setInputPort(e.target.value)} 
              placeholder="502" 
              type="number" 
            />
          </div>
          <Button className="mt-4 w-full" onClick={writeSetting}>
            <Save className="w-4 h-4 mr-2" /> Save Configuration
          </Button>
          <Button
            className="mt-2 w-full"
            variant="secondary"
            onClick={() => sendCommandRestartService("protocol_out.service", "restart", "This will restart the Modbus TCP service. Any ongoing communication will be interrupted. Are you sure?")}
            disabled={!modbusIP}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Restart Modbus TCP Service
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(ModbusTCP);