"use client";

import { useState, useEffect } from "react";
import { DirectMqttSensorDisplay } from "@/components/direct-mqtt-sensor-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { devicesApi, Device } from "@/lib/api-service";
import { toast } from "sonner";
import { Wifi, WifiOff, Plus, Trash2, Settings } from "lucide-react";

export default function MqttTestPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [testDevices, setTestDevices] = useState<Device[]>([
    {
      id: 999,
      name: "Test Sensor 1",
      type: "sensor",
      topic: "containment/rack1/temp_humidity",
      status: "active",
      isActive: true,
      sensorType: "temperature_humidity",
    },
    {
      id: 998,
      name: "Test Sensor 2", 
      type: "sensor",
      topic: "containment/rack2/power",
      status: "active",
      isActive: true,
      sensorType: "power",
    },
  ]);
  const [newTopic, setNewTopic] = useState("");

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const result = await devicesApi.getDevices();
      if (result.success && result.data) {
        // Filter only sensor devices with topics
        const sensorDevices = result.data.filter(
          device => device.type?.toLowerCase() === 'sensor' && device.topic
        );
        setDevices(sensorDevices);
      } else {
        toast.error(result.message || "Failed to load devices");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading devices");
    } finally {
      setLoading(false);
    }
  };

  const addTestDevice = () => {
    if (!newTopic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    const newDevice: Device = {
      id: Date.now(), // Use timestamp as ID for test devices
      name: `Test Device ${testDevices.length + 1}`,
      type: "sensor",
      topic: newTopic.trim(),
      status: "active",
      isActive: true,
      sensorType: "custom",
    };

    setTestDevices([...testDevices, newDevice]);
    setNewTopic("");
    toast.success(`Added test device with topic: ${newDevice.topic}`);
  };

  const removeTestDevice = (id: number) => {
    setTestDevices(testDevices.filter(device => device.id !== id));
    toast.success("Test device removed");
  };

  const allDevices = [...devices, ...testDevices];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Direct MQTT Sensor Test</h1>
          <p className="text-muted-foreground">
            Test direct MQTT subscription and sensor data parsing
          </p>
        </div>
        <Button onClick={loadDevices} disabled={loading}>
          <Settings className="h-4 w-4 mr-2" />
          Reload Devices
        </Button>
      </div>

      {/* Device Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Real Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">
              Sensor devices with topics
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Test Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testDevices.length}</div>
            <p className="text-xs text-muted-foreground">
              Virtual test devices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allDevices.length}</div>
            <p className="text-xs text-muted-foreground">
              Active MQTT subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Test Device */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Test Device</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="topic">MQTT Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., containment/rack1/sensor1"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTestDevice()}
              />
            </div>
            <Button onClick={addTestDevice} className="mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Add Test Device
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Test devices will listen to the specified MQTT topic for sensor data
          </div>
        </CardContent>
      </Card>

      {/* Live Sensor Data Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Sensor Data</CardTitle>
        </CardHeader>
        <CardContent>
          {allDevices.length > 0 ? (
            <div className="space-y-4">
              <DirectMqttSensorDisplay
                devices={allDevices}
                compact={false}
                showConnectionStatus={true}
                title="All Monitored Sensors"
              />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wifi className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sensor devices available</p>
              <p className="text-sm">Add devices with MQTT topics to start monitoring</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Real Devices</CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-muted-foreground">Topic: {device.topic}</div>
                      <div className="text-xs text-muted-foreground">Type: {device.sensorType}</div>
                    </div>
                    <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                      {device.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No real sensor devices found</p>
                <p className="text-sm">Configure device topics in the management panel</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Devices</CardTitle>
          </CardHeader>
          <CardContent>
            {testDevices.length > 0 ? (
              <div className="space-y-2">
                {testDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-muted-foreground">Topic: {device.topic}</div>
                      <div className="text-xs text-muted-foreground">Test device</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestDevice(device.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No test devices</p>
                <p className="text-sm">Add test devices to simulate MQTT data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">1. MQTT Connection (WebSocket Only)</h4>
              <p className="text-muted-foreground">
                Frontend connects via WebSocket to: <code className="bg-gray-100 px-1 rounded">mqttws.iotech.my.id</code>
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">2. MQTT Message Format</h4>
              <p className="text-muted-foreground">
                Send JSON messages like: <code className="bg-gray-100 px-1 rounded">{"{"}"temperature": 25.5, "humidity": 60.2{"}"}</code>
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">3. Supported Data Fields</h4>
              <ul className="text-muted-foreground list-disc list-inside">
                <li>temperature, temp - Temperature in Celsius</li>
                <li>humidity, hum - Humidity percentage</li>
                <li>voltage, volt - Voltage</li>
                <li>current, amp - Current</li>
                <li>power, watt - Power consumption</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">4. Test with MQTT Client</h4>
              <p className="text-muted-foreground">
                Use an MQTT client to publish test data to the configured topics. 
                Frontend automatically connects via WebSocket with fallback ports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}