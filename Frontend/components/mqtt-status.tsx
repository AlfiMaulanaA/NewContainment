//components/mqtt-status.tsx
"use client";

import { useMQTTStatus, type MQTTStatus } from "@/hooks/useMQTTStatus";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Loader2, Activity } from "lucide-react";

export default function MQTTConnectionBadge() {
  const status = useMQTTStatus();

  const getStatusInfo = () => {
    switch (status) {
      case "connected":
        return {
          color: "bg-green-500",
          icon: <CheckCircle className="w-4 h-4 mr-1" />,
          label: "Connected",
        };
      case "connecting":
        return {
          color: "bg-blue-500",
          icon: <Activity className="w-4 h-4 mr-1 animate-pulse" />,
          label: "Connecting...",
        };
      case "disconnected":
        return {
          color: "bg-yellow-500",
          icon: <AlertTriangle className="w-4 h-4 mr-1" />,
          label: "Disconnected",
        };
      case "error":
        return {
          color: "bg-red-500",
          icon: <XCircle className="w-4 h-4 mr-1" />,
          label: "Error",
        };
      default:
        return {
          color: "bg-gray-400",
          icon: <Loader2 className="w-4 h-4 mr-1 animate-spin" />,
          label: "Initializing...",
        };
    }
  };

  const { color, icon, label } = getStatusInfo();

  return (
    <Badge className={`flex items-center ${color} text-white px-2 py-1`}>
      {icon}
      <span className="text-sm">{label}</span>
    </Badge>
  );
}
