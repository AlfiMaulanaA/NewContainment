"use client";

import React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Network, 
  Wifi, 
  Globe, 
  Search, 
  Settings,
  Activity,
  TestTube,
  Router,
  Server,
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

interface NetworkFeature {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  status: "active" | "configured" | "warning";
}

const networkFeatures: NetworkFeature[] = [
  {
    title: "WiFi Management",
    description: "Scan, connect, and manage wireless network connections",
    icon: Wifi,
    href: "/network/wifi",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    features: ["Network Scanning", "Connection Management", "Profile Management"],
    status: "active"
  },
  {
    title: "IP Address Management",
    description: "Configure network interfaces and IP address settings",
    icon: Globe,
    href: "/network/ip-address",
    color: "text-green-600",
    bgColor: "bg-green-50", 
    borderColor: "border-green-200",
    features: ["Static IP Configuration", "DHCP Management", "Interface Control"],
    status: "configured"
  },
  {
    title: "Network Scanner",
    description: "Discover and analyze devices on your local network",
    icon: Search,
    href: "/network/ip-scanner",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200", 
    features: ["Device Discovery", "Port Scanning", "Manufacturer Detection"],
    status: "active"
  },
  {
    title: "Modbus TCP Protocol",
    description: "Configure Modbus TCP communication settings",
    icon: Settings,
    href: "/network/protocol/modbus",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    features: ["IP Configuration", "Port Settings", "Service Management"],
    status: "configured"
  },
  {
    title: "SNMP Protocol",
    description: "Manage SNMP configuration and monitoring settings",
    icon: Activity,
    href: "/network/protocol/snmp",
    color: "text-indigo-600", 
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    features: ["Authentication Setup", "Trap Configuration", "Version Management"],
    status: "warning"
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "configured":
      return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    case "configured":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Configured</Badge>;
    case "warning":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Needs Attention</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

export default function NetworkOverviewPage() {
  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Network className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Network Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            System Online
          </Badge>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Overview Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Network Management Center</h2>
            <p className="text-muted-foreground">
              Comprehensive network configuration and monitoring tools for your IoT containment system
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-2 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Router className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Network Status</p>
                    <p className="text-lg font-bold text-blue-600">Connected</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Settings className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Protocols</p>
                    <p className="text-lg font-bold text-green-600">5 Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Search className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Discovery</p>
                    <p className="text-lg font-bold text-purple-600">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TestTube className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-800">Testing</p>
                    <p className="text-lg font-bold text-orange-600">Ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Network Features Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Network Features</h3>
            <p className="text-sm text-muted-foreground">
              Click on any feature to access its configuration and management tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networkFeatures.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card key={feature.href} className={`border-2 ${feature.borderColor} hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 ${feature.bgColor} rounded-lg`}>
                        <IconComponent className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(feature.status)}
                        {getStatusBadge(feature.status)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Key Features
                      </p>
                      <div className="space-y-1">
                        {feature.features.map((feat, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                            <span className="text-xs text-gray-600">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Link href={feature.href} className="block">
                      <Button className="w-full h-10 group">
                        Open {feature.title.split(' ')[0]}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Information Panel */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Network className="w-6 h-6 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900">Network Management Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div className="space-y-1">
                    <p>• <strong>WiFi Management:</strong> Connect to wireless networks and manage profiles</p>
                    <p>• <strong>IP Configuration:</strong> Set static IPs, manage DHCP, and control network interfaces</p>
                    <p>• <strong>Network Discovery:</strong> Scan and identify devices on your local network</p>
                  </div>
                  <div className="space-y-1">
                    <p>• <strong>Protocol Configuration:</strong> Set up Modbus TCP and SNMP communications</p>
                    <p>• <strong>Monitoring Tools:</strong> Real-time status monitoring and connectivity testing</p>
                    <p>• <strong>Service Management:</strong> Start, stop, and restart network services</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}