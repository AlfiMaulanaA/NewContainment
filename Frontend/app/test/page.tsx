"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HardDriveUpload, HardDrive, Server, ArrowLeft, X } from "lucide-react"; // Added X for dialog close
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Keep Table for device dialog

import {
  racksApi,
  containmentsApi,
  devicesApi,
  Rack,
  Containment,
  Device,
  getContainmentTypeString
} from "@/lib/api-service";
import { toast } from "sonner";

export default function RackManagementPage({ containmentId: propContainmentId }: { containmentId?: number } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get containmentId from URL params or props
  const urlContainmentId = searchParams.get('containmentId');
  const containmentName = searchParams.get('containmentName') || '';
  const containmentId = propContainmentId || (urlContainmentId ? parseInt(urlContainmentId) : undefined);

  const [racks, setRacks] = useState<Rack[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});
  const [selectedRackForDevices, setSelectedRackForDevices] = useState<{ rack: Rack; devices: Device[] } | null>(null);

  // Load device counts for racks
  const loadDeviceCounts = async (racks: Rack[]) => {
    try {
      const deviceCountPromises = racks.map(async (rack) => {
        const result = await devicesApi.getDevicesByRack(rack.id);
        return { rackId: rack.id, count: result.success && result.data ? result.data.length : 0 };
      });

      const counts = await Promise.all(deviceCountPromises);
      const deviceCountMap: Record<number, number> = {};
      counts.forEach(({ rackId, count }) => {
        deviceCountMap[rackId] = count;
      });

      setDeviceCounts(deviceCountMap);
    } catch (error: any) {
      console.error("Failed to load device counts:", error);
      toast.error("Failed to load device counts for some racks.");
    }
  };

  // Load racks by containment ID
  const loadRacksByContainment = async (containmentId: number) => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacksByContainment(containmentId),
        containmentsApi.getContainments()
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        await loadDeviceCounts(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
        setRacks([]); // Clear racks on error
      }

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      } else {
        toast.error(containmentsResult.message || "Failed to load containments");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading data");
      setRacks([]); // Clear racks on error
      setContainments([]); // Clear containments on error
    } finally {
      setLoading(false);
    }
  };

  // Load all racks and containments
  const loadRacks = async () => {
    setLoading(true);
    try {
      const [racksResult, containmentsResult] = await Promise.all([
        racksApi.getRacks(),
        containmentsApi.getContainments()
      ]);

      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
        await loadDeviceCounts(racksResult.data);
      } else {
        toast.error(racksResult.message || "Failed to load racks");
        setRacks([]);
      }

      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      } else {
        toast.error(containmentsResult.message || "Failed to load containments");
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message || "Error loading data");
      setRacks([]);
      setContainments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data based on containmentId presence
  useEffect(() => {
    if (containmentId) {
      loadRacksByContainment(containmentId);
    } else {
      loadRacks();
    }
  }, [containmentId]); // Re-run when containmentId changes

  // Get containment name by ID
  const getContainmentName = (containmentId: number | null | undefined): string => {
    if (!containmentId || containmentId <= 0 || !containments.length) return 'Unknown Containment';
    const containment = containments.find(c => c.id === containmentId);
    return containment ? containment.name : 'Unknown Containment';
  };

  // Get containment by ID
  const getContainment = (containmentId: number | null | undefined): Containment | undefined => {
    if (!containmentId || containmentId <= 0 || !containments.length) return undefined;
    return containments.find(c => c.id === containmentId);
  };

  // Show devices dialog for a specific rack
  const handleShowRackDevices = async (rack: Rack) => {
    setSelectedRackForDevices({ rack, devices: [] });
    console.log("Loading devices for rack:", rack.name); // For debugging
    try {
      const result = await devicesApi.getDevicesByRack(rack.id);
      if (result.success && result.data) {
        setSelectedRackForDevices({ rack, devices: result.data });
      } else {
        toast.error(result.message || "Failed to load devices");
        setSelectedRackForDevices(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading devices");
      setSelectedRackForDevices(null);
    }
  };

  // Get status badge color for devices (retained for device dialog)
  const getDeviceStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
      case 'offline':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'maintenance':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <>
      {/* Rack List Grid of Cards */}
      <Card className="">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {containmentId ? `Racks in ${containmentName || getContainmentName(containmentId)}` : 'Total Racks'} {racks.length}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {racks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {racks.map((rack) => {
                    const containment = getContainment(rack.containmentId);
                    return (
                      <Card key={rack.id} className="group flex flex-col justify-between">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>{rack.name}</span>
                            <Badge variant={rack.isActive ? "default" : "secondary"} className="text-xs ml-2">
                              {rack.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Data Sensor
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                        
                          <div className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium text-foreground">Location:</span> {containment?.location || 'N/A'}
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowRackDevices(rack)}
                              className="text-blue-600 hover:text-blue-800 p-1 h-auto font-medium"
                              title="View devices in this rack"
                            >
                              <HardDrive className="h-4 w-4 mr-1" /> {deviceCounts[rack.id] || 0} devices
                            </Button>
                            {/* Removed Edit and Delete Buttons */}
                            {(deviceCounts[rack.id] || 0) > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/management/devices/rack?rackId=${rack.id}&rackName=${encodeURIComponent(rack.name)}`)}
                                  className="text-gray-500 hover:text-gray-700 p-1 h-auto"
                                  title="Manage devices"
                                >
                                  <Server className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <HardDriveUpload className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-medium">No Racks Found</p>
                  <p className="text-sm">
                    {containmentId
                      ? `There are no racks in ${containmentName || getContainmentName(containmentId)}.`
                      : "No racks have been added yet."}
                  </p>
                  {/* Removed Add New Rack Button from empty state */}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      
      {selectedRackForDevices && (
       
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Devices in {selectedRackForDevices.rack.name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRackForDevices(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </CardHeader>
                <CardContent className="flex-grow overflow-auto p-0">
                  {selectedRackForDevices.devices.length === 0 && !loading && (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                  {selectedRackForDevices.devices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Device Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>MQTT Topic</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRackForDevices.devices.map((device, index) => (
                          <TableRow key={device.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{device.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{device.type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.serialNumber || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getDeviceStatusBadgeColor(device.status)}>
                                {device.status || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.topic || '-'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {device.description || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                     (!loading && selectedRackForDevices.devices.length === 0) && (
                        <div className="text-center py-12 text-muted-foreground">
                            <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No devices found</p>
                            <p className="text-sm">This rack doesn't have any devices installed.</p>
                        </div>
                    )
                  )}
                </CardContent>
              </Card>
            </div>
      )}
    </>
  );
}