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
  Search,
  RefreshCw,
  Loader2,
  Globe,
  CheckCircle2
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
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Search className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Network Scanner</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleScan} 
            variant="outline" 
            size="sm" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-1" />
            )}
            {loading ? 'Scanning...' : 'Start Scan'}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Network Discovery
              {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </CardTitle>
            <CardDescription>
              Scan your local network to discover active devices and their information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleScan}
                    disabled={loading}
                    className="h-11 min-w-[140px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Start Network Scan
                      </>
                    )}
                  </Button>
                  {activeDevices.length > 0 && !loading && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Found {activeDevices.length} devices
                    </div>
                  )}
                </div>
                {loading && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Scanning IP addresses (192.168.x.1-255)... {Math.round(progress)}% complete
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 mb-1">Scan Information</p>
                    <ul className="text-blue-700 space-y-1 text-xs">
                      <li>• Discovers devices on local subnet</li>
                      <li>• Shows IP, MAC, and manufacturer data</li>
                      <li>• Identifies open network ports</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <span className="text-lg text-blue-500">Scanning network devices...</span>
                <p className="text-sm text-muted-foreground mt-2">Discovering active devices on your network</p>
              </div>
            ) : activeDevices.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Router className="w-5 h-5 text-green-600" />
                    Discovered Devices
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {activeDevices.length} devices found
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">IP Address</TableHead>
                        <TableHead className="font-semibold">MAC Address</TableHead>
                        <TableHead className="font-semibold">Manufacturer</TableHead>
                        <TableHead className="font-semibold">Open Ports</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDevices.map((device, index) => (
                        <TableRow key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Computer className="w-4 h-4 text-green-600" />
                              <a
                                href={`http://${device.ipAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-blue-600 hover:underline font-medium"
                              >
                                {device.ipAddress}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Network className="w-4 h-4 text-blue-600" />
                              {device.macAddress || <span className="text-muted-foreground">Unknown</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Factory className="w-4 h-4 text-purple-600" />
                              {device.manufacturer || <span className="text-muted-foreground">Unknown</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4 text-orange-600" />
                              {device.openPorts && device.openPorts.length > 0 ? (
                                <span className="font-mono text-sm">{device.openPorts.join(", ")}</span>
                              ) : (
                                <span className="text-muted-foreground">None detected</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-slate-50 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Search className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                <p className="text-gray-500 mb-6">Start a network scan to discover active devices on your network</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
