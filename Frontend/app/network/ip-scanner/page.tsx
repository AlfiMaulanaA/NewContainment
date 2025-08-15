// File: app/ipscanner/page.tsx
// Description: A Next.js page to scan the local network and display active devices in a table format.
// This version fetches data directly from a backend API endpoint using a dedicated API service.

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Wifi,
  Router,
  Network,
  Server,
  Factory,
  Activity,
  Computer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// --- Import new API service ---
import { ipScannerApi, ScannedDevice } from "@/lib/api-service";

// --- Main component starts here ---

export default function IpScannerPage() {
  const [activeDevices, setActiveDevices] = useState<ScannedDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * @description Handles the network scan process by calling the backend service through the api-service.
   * Uses the api-service module to send an HTTP request and display the results in a table.
   */
  const handleScan = async () => {
    setLoading(true);
    setProgress(0);
    setActiveDevices([]);
    toast.info("Starting network scan...");

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 5;
        if (newProgress >= 95) clearInterval(interval);
        return newProgress;
      });
    }, 200);

    try {
      const result = await ipScannerApi.scanNetwork();

      clearInterval(interval);
      setProgress(100);

      if (result.success && result.data) {
        setActiveDevices(result.data);
        toast.success(
          `Scan complete! Found ${result.data.length} active devices.`
        );
      } else {
        setActiveDevices([]);
        toast.error(
          result.message ||
            "Failed to scan network. Please ensure your backend is running."
        );
      }
    } catch (error: any) {
      clearInterval(interval);
      setProgress(100);
      setActiveDevices([]);
      toast.error(
        error.message ||
          "Failed to scan network. Please ensure your backend is running."
      );
      console.error("Network scan error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Network Scanner</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card className="w-full shadow-xl rounded-lg border border-gray-200">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2 text-primary">
              <Wifi className="h-8 w-8" />
              Local Network Scanner
            </CardTitle>
            <CardDescription className="text-lg mt-2 text-gray-600">
              Discover active devices and detailed information on your network.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleScan}
                disabled={loading}
                className="w-full text-lg font-semibold h-12"
              >
                {loading ? "Scanning..." : "Start Network Scan"}
              </Button>
              {loading && (
                <div className="w-full">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-gray-500 mt-2">
                    Scanning IP addresses from 1 to 255. Please wait...
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Router className="h-6 w-6 text-primary" />
                Active Devices ({activeDevices.length})
              </h3>
              {activeDevices.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>MAC Address</TableHead>
                        <TableHead>Manufacturer</TableHead>
                        <TableHead>Open Ports</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDevices.map((device, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Computer className="h-4 w-4 text-green-500" />
                              <a
                                href={`http://${device.ipAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {device.ipAddress}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Network className="h-4 w-4 text-indigo-500" />
                              {device.macAddress || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4 text-blue-500" />
                              {device.manufacturer || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4 text-purple-500" />
                              {device.openPorts && device.openPorts.length > 0
                                ? device.openPorts.join(", ")
                                : "-"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <p>
                    {loading
                      ? "Loading data..."
                      : "Click the button to start the network scan."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
