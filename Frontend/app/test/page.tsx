"use client";

import { useEffect, useState } from "react";
import { MqttClient, IClientOptions } from "mqtt";
import {
  Download,
  BarChart3,
  Table2,
  TrendingUp,
  Filter,
  RefreshCw,
  Activity,
  Server,
  Database,
  Thermometer,
  Droplets,
  Gauge,
  LineChart,
} from "lucide-react";

// Menggunakan impor komponen dari file lokal Anda
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

const App = () => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [receivedMessages, setReceivedMessages] = useState<any[]>([]);
  const [mode, setMode] = useState<string>("reading sensor");
  const [commandInput, setCommandInput] = useState<string>("");
  const [dataInput, setDataInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("control");

  // Topik untuk komunikasi MQTT
  const COMMAND_TOPIC: string = "IOT/Containment/Sensor/Config";
  const RESPONSE_TOPIC: string = "IOT/Containment/Sensor/Config/Data";

  useEffect(() => {
    let newClient: MqttClient | null = null;

    const connectToMqtt = async () => {
      try {
        const mqtt = (await import("mqtt")).default;
        const options: IClientOptions = {
          protocol: "ws",
        };
        newClient = mqtt.connect("ws://192.168.0.138:9000", options);
        setClient(newClient);

        newClient.on("connect", () => {
          console.log("Connected to MQTT Broker!");
          setIsConnected(true);
          if (newClient) {
            newClient.subscribe(RESPONSE_TOPIC, (err) => {
              if (err) {
                console.error("Subscription error:", err);
              }
            });
          }
        });

        newClient.on("message", (topic: string, message: Buffer) => {
          try {
            const payload = JSON.parse(message.toString());
            setReceivedMessages((prevMessages) => [payload, ...prevMessages]); // Pesan terbaru di atas
            console.log(`Message received from topic ${topic}:`, payload);
          } catch (e) {
            console.error("Failed to parse message:", e);
          }
        });

        newClient.on("error", (err) => {
          console.error("Connection error:", err);
        });

        newClient.on("close", () => {
          console.log("Connection to MQTT broker closed");
          setIsConnected(false);
        });
      } catch (err) {
        console.error("Failed to connect to MQTT:", err);
      }
    };

    connectToMqtt();

    return () => {
      if (newClient) {
        newClient.end();
      }
    };
  }, []);

  const publishCommand = (command: string, data: Record<string, any> = {}) => {
    if (client && isConnected) {
      const payload: string = JSON.stringify({ command, data });
      client.publish(COMMAND_TOPIC, payload, (err) => {
        if (err) {
          console.error("Failed to publish message:", err);
        } else {
          console.log(`Command published: ${payload}`);
        }
      });
    } else {
      console.warn("Client is not connected. Cannot publish message.");
    }
  };

  const handleManualCommand = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, any> = dataInput ? JSON.parse(dataInput) : {};
      publishCommand(commandInput, data);
      setCommandInput("");
      setDataInput("");
    } catch (error) {
      console.error("Failed to parse data JSON:", error);
      console.error("Error: Data JSON tidak valid.");
    }
  };

  const renderConnectionStatus = () => (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span
        className={`font-bold ${
          isConnected ? "text-green-600" : "text-red-600"
        }`}
      >
        {isConnected ? "Terhubung" : "Tidak Terhubung"}
      </span>
    </div>
  );

  const renderControlPanel = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Mode</CardTitle>
          <Badge
            className={`w-fit mt-2 ${
              mode === "reading sensor"
                ? "bg-indigo-500 text-white"
                : "bg-gray-500 text-white"
            }`}
          >
            <Database className="mr-2 h-4 w-4" />
            <span className="capitalize">{mode}</span>
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            onClick={() => {
              publishCommand("change mode to reading sensor");
              setMode("reading sensor");
            }}
            disabled={!isConnected}
            className={`w-full ${
              mode === "reading sensor"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Reading Sensor
          </Button>
          <Button
            onClick={() => {
              publishCommand("change mode to scan");
              setMode("scan address");
            }}
            disabled={!isConnected}
            className={`w-full ${
              mode === "scan address"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            <Filter className="mr-2 h-4 w-4" />
            Scan Address
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualCommand} className="space-y-3">
            <input
              type="text"
              placeholder="Enter command (e.g., get sensor list)"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              className="w-full p-2 rounded-md border"
            />
            <textarea
              placeholder="Enter data JSON (optional)"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              rows={3}
              className="w-full p-2 rounded-md border"
            />
            <Button
              type="submit"
              disabled={!isConnected || !commandInput}
              className="w-full bg-indigo-500 text-white hover:bg-indigo-600"
            >
              <Server className="mr-2 h-4 w-4" />
              Send Command
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const renderDataDisplay = () => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Received Responses</CardTitle>
        <Button className="w-fit" onClick={() => setReceivedMessages([])}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Clear Log
        </Button>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto">
          {receivedMessages.length > 0 ? (
            <ul className="space-y-2">
              {receivedMessages.map((msg, index: number) => (
                <li
                  key={index}
                  className="bg-gray-50 p-3 rounded-md shadow-sm text-sm break-words"
                >
                  <strong className="text-blue-600">Command:</strong>{" "}
                  {msg.command || "N/A"}
                  <br />
                  <strong className="text-green-600">Result:</strong>{" "}
                  {msg.result || "N/A"}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-gray-500 py-10">
              No messages received yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white rounded-lg shadow-md mb-6">
        <BarChart3 className="h-5 w-5 text-gray-700" />
        <h1 className="text-lg font-semibold text-gray-900">
          IoT Sensor Dashboard
        </h1>
        <div className="ml-auto">{renderConnectionStatus()}</div>
      </header>

      <div className="flex flex-1 flex-col gap-4">
        <Tabs defaultValue="control" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="control"
              onClick={() => setActiveTab("control")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Control Panel
            </TabsTrigger>
            <TabsTrigger value="data" onClick={() => setActiveTab("data")}>
              <Table2 className="mr-2 h-4 w-4" />
              Data Log
            </TabsTrigger>
          </TabsList>
          <TabsContent value="control" className="mt-6">
            {renderControlPanel()}
          </TabsContent>
          <TabsContent value="data" className="mt-6">
            {renderDataDisplay()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default App;
