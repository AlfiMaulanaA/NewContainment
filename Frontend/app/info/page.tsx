"use client";

import {
  SiNodedotjs,
  SiPython,
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiHtml5,
  SiTailwindcss,
  SiCss3,
  SiMysql,
  SiDotnet,
} from "react-icons/si";

import {
  FileQuestion,
  Network,
  ServerCog,
  PlusCircle,
  BarChart2,
  AlertTriangle,
  RotateCw,
  SatelliteDish,
  GaugeCircle,
  HardDrive,
  Database,
  Info,
  Shield,
  Server,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Monitor,
  Cpu,
  MemoryStick,
  HardDriveIcon,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionInfo } from "@/components/session-info";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { systemInfoApi } from "@/lib/api-service";
import { useEffect, useState } from "react";

export default function SystemInfoPage() {
  const { isOnline, lastChecked, responseTime, error, manualCheck } = useBackendStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [systemInfo, setSystemInfo] = useState({
    version: "1.0.0",
    environment: "Development",
    uptime: "N/A",
    lastHealthCheck: null as Date | null
  });

  const techStack = [
    { name: "Next.js", icon: <SiNextdotjs size={32} className="text-black dark:text-white" /> },
    { name: "TypeScript", icon: <SiTypescript size={32} className="text-sky-600" /> },
    { name: "Tailwind CSS", icon: <SiTailwindcss size={32} className="text-cyan-500" /> },
    { name: "HTML", icon: <SiHtml5 size={32} className="text-orange-500" /> },
    { name: "CSS", icon: <SiCss3 size={32} className="text-blue-600" /> },
    { name: ".NET Core", icon: <SiDotnet size={38} className="text-white bg-purple-600 rounded-sm p-1" /> },
    { name: "MySQL", icon: <SiMysql size={32} className="text-sky-500" /> },
    { name: "Node.js", icon: <SiNodedotjs size={32} className="text-green-600" /> },
    { name: "Python", icon: <SiPython size={32} className="text-blue-500" /> },
    { name: "MQTT", icon: <SatelliteDish size={32} className="text-red-600" /> },
  ];

  // Fetch backend health info using api-service
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const healthResult = await systemInfoApi.getSystemHealth();
        if (healthResult.success && healthResult.data) {
          setSystemInfo({
            version: "1.0.0", // Static version since not available in SystemHealth
            environment: "Development", // Static environment since not available in SystemHealth
            uptime: healthResult.data.timestamp || "N/A",
            lastHealthCheck: new Date()
          });
        }
      } catch (error) {
        console.error("Failed to fetch system info:", error);
      }
    };

    fetchSystemInfo();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await manualCheck();
    } finally {
      setIsChecking(false);
    }
  };

  const services = [
    {
      name: "ASP.NET Core API",
      status: isOnline ? "running" : "stopped",
      description: "Backend API service",
      responseTime: responseTime,
      lastCheck: lastChecked
    },
    {
      name: "Entity Framework",
      status: isOnline ? "connected" : "disconnected", 
      description: "Database ORM",
      responseTime: null,
      lastCheck: lastChecked
    },
    {
      name: "MQTT Service",
      status: "running",
      description: "IoT message broker",
      responseTime: null,
      lastCheck: null
    },
    {
      name: "WhatsApp Integration",
      status: "active",
      description: "Notification service",
      responseTime: null,
      lastCheck: null
    },
    {
      name: "SignalR Hub",
      status: "active",
      description: "Real-time communication",
      responseTime: null,
      lastCheck: null
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
      case "connected":
      case "active":
        return "bg-green-500";
      case "stopped":
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
      case "connected":
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "stopped":
      case "disconnected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const faqs = [
    {
      icon: <Network className="w-5 h-5 text-blue-600 mt-1" />,
      question: "What communication protocols are supported?",
      answer: "The system supports Modbus RTU/TCP and MQTT protocols for device communication, and SNMP for network equipment.",
    },
    {
      icon: <PlusCircle className="w-5 h-5 text-green-600 mt-1" />,
      question: "Can I add custom IoT devices?",
      answer: "Yes, the system is designed to be extensible. You can add, update, or delete custom IoT devices and their specific monitoring points via the Device Manager.",
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-yellow-500 mt-1" />,
      question: "What types of data are monitored?",
      answer: "The system monitors critical environmental and power data, including Temperature, Humidity, Smoke, Water Leaks, Voltage, Current, Power, and Energy consumption.",
    },
    {
      icon: <GaugeCircle className="w-5 h-5 text-purple-600 mt-1" />,
      question: "How does device status work?",
      answer: (
        <>
          A device's status is considered <strong>Online</strong> if it is actively sending data to the system and has a successful connection to the controller. If there is no data or connection, its status will be <strong>Offline</strong>.
        </>
      ),
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />,
      question: "What should I do if data isn't showing?",
      answer: "First, verify the physical and network connections of the device. Then, check the status of the MQTT broker and ensure all port and protocol settings are configured correctly.",
    },
    {
      icon: <Database className="w-5 h-5 text-gray-500 mt-1" />,
      question: "Where is the monitoring data stored?",
      answer: "All monitoring data is stored securely in a MySQL database for historical analysis, reporting, and real-time visualization.",
    },
  ];

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Info className="w-5 h-5" />
          <h1 className="text-lg font-semibold">System Information</h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.location.reload()}
          title="Reload page"
          aria-label="Reload"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="backend" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="backend" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Backend Status
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              System Info
            </TabsTrigger>
            <TabsTrigger value="session" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Session Info
            </TabsTrigger>
          </TabsList>
          
          {/* Backend Status Tab */}
          <TabsContent value="backend" className="mt-6 space-y-6">
            <div className="grid gap-6">
              {/* Backend Connection Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="h-5 w-5 text-green-600" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-600" />
                    )}
                    Backend Connection Status
                  </CardTitle>
                  <CardDescription>
                    Real-time monitoring of backend server connectivity and health
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-medium">
                        {isOnline ? 'Connected' : 'Disconnected'}
                      </span>
                      <Badge variant={isOnline ? "default" : "destructive"}>
                        {isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualCheck}
                      disabled={isChecking}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                      Check Now
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Last checked:</span>
                      <span className="text-sm font-medium">
                        {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Response time:</span>
                      <span className="text-sm font-medium">
                        {responseTime ? `${responseTime}ms` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <span className="text-sm font-medium">
                        {error || 'Healthy'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    System Information
                  </CardTitle>
                  <CardDescription>
                    Backend server configuration and runtime information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Version:</span>
                        <Badge variant="outline">{systemInfo.version}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Environment:</span>
                        <Badge variant={systemInfo.environment === 'Production' ? 'default' : 'secondary'}>
                          {systemInfo.environment}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Uptime:</span>
                        <span className="text-sm font-medium">{systemInfo.uptime}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Health Check:</span>
                        <span className="text-sm font-medium">
                          {systemInfo.lastHealthCheck 
                            ? systemInfo.lastHealthCheck.toLocaleTimeString() 
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">API Endpoint:</span>
                        <span className="text-sm font-mono">http://localhost:5000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Protocol:</span>
                        <span className="text-sm font-medium">HTTP/HTTPS</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="mt-6 space-y-6">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ServerCog className="h-5 w-5" />
                    Application Services
                  </CardTitle>
                  <CardDescription>
                    Status and health monitoring of all backend services and components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(service.status)}
                          <div>
                            <h4 className="font-medium">{service.name}</h4>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={getStatusColor(service.status) + " text-white"}>
                            {service.status}
                          </Badge>
                          {service.responseTime && (
                            <p className="text-xs text-muted-foreground">
                              {service.responseTime}ms
                            </p>
                          )}
                          {service.lastCheck && (
                            <p className="text-xs text-muted-foreground">
                              {service.lastCheck.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    System resource utilization and performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">CPU Usage</span>
                      </div>
                      <Progress value={25} className="h-2" />
                      <p className="text-xs text-muted-foreground">25%</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MemoryStick className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Memory</span>
                      </div>
                      <Progress value={45} className="h-2" />
                      <p className="text-xs text-muted-foreground">45%</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <HardDriveIcon className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Disk Usage</span>
                      </div>
                      <Progress value={60} className="h-2" />
                      <p className="text-xs text-muted-foreground">60%</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">Network</span>
                      </div>
                      <Progress value={30} className="h-2" />
                      <p className="text-xs text-muted-foreground">30%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="system" className="mt-6 px-6 md:px-12 lg:px-24 space-y-12">
        {/* Info Section */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ServerCog className="w-5 h-5 text-primary" />
            <h2 className="text-3xl font-bold">Containment Mini Data Center IoT Monitoring System</h2>
          </div>
          <p className="text-muted-foreground max-w-3xl leading-relaxed">
            This system provides a comprehensive solution for <strong>real-time monitoring and control of a Containment Mini Data Center</strong>. It leverages IoT technology to collect critical environmental and power data from various sensors and devices. The system supports multiple industrial protocols and provides a web interface for intuitive visualization, management, and alerting, ensuring the data center operates under optimal conditions.
          </p>
        </section>

        <Separator />

        {/* FAQ Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileQuestion className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          </div>
          <ul className="space-y-6 text-sm sm:text-base">
            {faqs.map((faq, index) => (
              <li
                key={index}
                className="flex gap-3 p-4 rounded-xl hover:bg-accent/40 transition duration-300 shadow-sm"
              >
                {faq.icon}
                <div className="transition-all">
                  <strong className="block mb-1">{faq.question}</strong>
                  <span className="text-muted-foreground">{faq.answer}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Tech Stack Section */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ServerCog className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">Technology Stack</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            The system is built on a modern and robust technology stack to ensure high performance, scalability, and reliability.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="group p-4 rounded-2xl shadow-md transition-transform duration-300 hover:scale-105 hover:bg-primary/10 cursor-pointer"
              >
                <div className="flex flex-col items-center space-y-2">
                  {tech.icon}
                  <span className="text-sm font-medium group-hover:text-foreground">
                    {tech.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
          </TabsContent>
          
          <TabsContent value="session" className="mt-6">
            <SessionInfo />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}