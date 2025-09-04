"use client";

import { useState, useEffect, useCallback } from "react";
import { useMQTT } from "@/hooks/useMQTT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  List,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  Tablet,
} from "lucide-react";

// --- Interfaces
interface Device {
  id: string;
  name: string;
  ip: string;
  port?: number;
  password?: number;
  timeout?: number;
  force_udp?: boolean;
  enabled?: boolean;
}

interface MqttResponsePayload {
  status: "success" | "error";
  message: string;
  data?: {
    devices?: Device[];
    total_devices?: number;
  };
  device?: Device;
  deleted_device?: Device;
}

// --- Main Component
export default function DeviceManagement() {
  const { isConnected, isConnecting, publish, subscribe, unsubscribe, error } =
    useMQTT();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<Partial<Device>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "update">("add");
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);

  const requestTopic = "accessControl/device/command";
  const responseTopic = "accessControl/device/response";

  // Deklarasikan handleListDevices terlebih dahulu
  const handleListDevices = useCallback(async () => {
    if (!isConnected) return;
    setIsRefreshing(true);
    const command = { command: "listDevices" };
    await publish(requestTopic, JSON.stringify(command));
  }, [isConnected, publish, requestTopic]);

  // Kemudian, deklarasikan handleResponse yang memiliki dependensi pada handleListDevices
  const handleResponse = useCallback(
    (topic: string, message: string) => {
      try {
        const payload: MqttResponsePayload = JSON.parse(message);
        if (payload.status === "success") {
          if (payload.data && payload.data.devices) {
            setDevices(payload.data.devices);
          } else if (payload.device || payload.deleted_device) {
            // Re-fetch the list to show the latest changes
            handleListDevices();
          }
        } else {
          console.error("MQTT Error:", payload.message);
          alert(`Error: ${payload.message}`);
        }
      } catch (e) {
        console.error("Failed to parse MQTT message:", e);
      } finally {
        setIsRefreshing(false);
        setIsDialogOpen(false);
        setDeleteDeviceId(null);
      }
    },
    [handleListDevices]
  );

  const handleAddDevice = async () => {
    if (!formData.id || !formData.name || !formData.ip) {
      alert("ID, Name, and IP are required.");
      return;
    }
    const command = {
      command: "addDevice",
      data: formData,
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleUpdateDevice = async () => {
    if (!formData.id) {
      alert("Device ID is required for update.");
      return;
    }
    const command = {
      command: "updateDevice",
      data: {
        device_id: formData.id,
        ...formData,
      },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleDeleteDevice = async () => {
    if (!deleteDeviceId) return;
    const command = {
      command: "deleteDevice",
      data: {
        device_id: deleteDeviceId,
      },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const openAddDialog = () => {
    setDialogMode("add");
    setFormData({});
    setIsDialogOpen(true);
  };

  const openUpdateDialog = (device: Device) => {
    setDialogMode("update");
    setFormData(device);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (isConnected) {
      subscribe(responseTopic, handleResponse);
      handleListDevices(); // Initial fetch on component mount
    }
    return () => {
      unsubscribe(responseTopic);
    };
  }, [
    isConnected,
    subscribe,
    unsubscribe,
    responseTopic,
    handleResponse,
    handleListDevices,
  ]);

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Devices</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            MQTT Status:
            {isConnecting ? (
              <span className="ml-2 text-yellow-500">Connecting...</span>
            ) : isConnected ? (
              <span className="ml-2 text-green-500">Connected</span>
            ) : (
              <span className="ml-2 text-red-500">Disconnected</span>
            )}
          </Badge>
          <Button
            variant="outline"
            onClick={handleListDevices}
            disabled={!isConnected || isRefreshing}
          >
            <List className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "add" ? "Add New Device" : "Update Device"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="id">ID</Label>
                  <Input
                    id="id"
                    value={formData.id || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, id: e.target.value })
                    }
                    disabled={dialogMode === "update"}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="ip">IP Address</Label>
                  <Input
                    id="ip"
                    value={formData.ip || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ip: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    dialogMode === "add" ? handleAddDevice : handleUpdateDevice
                  }
                >
                  {dialogMode === "add" ? "Add" : "Update"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRefreshing ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : devices.length > 0 ? (
          <UITable>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.id}</TableCell>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.ip}</TableCell>
                  <TableCell>
                    {device.enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openUpdateDialog(device)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDeviceId(device.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the device.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteDevice}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        ) : (
          <div className="text-center text-gray-500">No devices found.</div>
        )}
      </CardContent>
    </Card>
  );
}
