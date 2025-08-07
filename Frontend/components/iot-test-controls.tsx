"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  TestTube, 
  Send, 
  RotateCcw,
  AlertTriangle,
  CheckCircle 
} from "lucide-react";
import { containmentStatusApi } from "@/lib/api-service";
import { toast } from "sonner";

interface IoTTestControlsProps {
  className?: string;
}

export default function IoTTestControls({ className }: IoTTestControlsProps) {
  const [containmentId, setContainmentId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState({
    "Lighting status": false,
    "Emergency status": false,
    "Smoke Detector status": false,
    "FSS status": false,
    "Emergency Button State": false,
    "selenoid status": false,  
    "limit switch front door status": true,
    "limit switch back door status": false,
    "open front door status": false,
    "open back door status": false,
    "Emergency temp": false,
    "Timestamp": new Date().toISOString().slice(0, 19).replace('T', ' ')
  });

  const updateTestData = (key: string, value: boolean) => {
    setTestData(prev => ({
      ...prev,
      [key]: value,
      "Timestamp": new Date().toISOString().slice(0, 19).replace('T', ' ')
    }));
  };

  const sendTestData = async () => {
    setLoading(true);
    try {
      const result = await containmentStatusApi.processPayload(containmentId, testData);
      if (result.success) {
        toast.success("Test IoT data sent successfully!");
      } else {
        toast.error(result.message || "Failed to send test data");
      }
    } catch (error: any) {
      toast.error("Error sending test data");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setTestData({
      "Lighting status": false,
      "Emergency status": false,
      "Smoke Detector status": false,
      "FSS status": false,
      "Emergency Button State": false,
      "selenoid status": false,
      "limit switch front door status": true,
      "limit switch back door status": false,
      "open front door status": false,
      "open back door status": false,
      "Emergency temp": false,
      "Timestamp": new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  };

  const setEmergencyScenario = () => {
    setTestData({
      "Lighting status": true,
      "Emergency status": true,
      "Smoke Detector status": true,
      "FSS status": true,
      "Emergency Button State": true,
      "selenoid status": true,
      "limit switch front door status": false,
      "limit switch back door status": false,
      "open front door status": true,
      "open back door status": true,
      "Emergency temp": true,
      "Timestamp": new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  };

  const setNormalScenario = () => {
    setTestData({
      "Lighting status": true,
      "Emergency status": false,
      "Smoke Detector status": false,
      "FSS status": true,
      "Emergency Button State": false,
      "selenoid status": false,
      "limit switch front door status": true,
      "limit switch back door status": true,
      "open front door status": false,
      "open back door status": false,
      "Emergency temp": false,
      "Timestamp": new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  };

  const getStatusColor = (key: string, value: boolean) => {
    if (key.includes('Emergency') || key.includes('Smoke') || key.includes('temp')) {
      return value ? "text-red-600" : "text-green-600";
    }
    return value ? "text-green-600" : "text-gray-500";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          IoT Test Controls
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Containment Selection */}
        <div className="flex items-center gap-2">
          <Label>Target Containment:</Label>
          <Select value={containmentId.toString()} onValueChange={(value) => setContainmentId(parseInt(value))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Containment 1 - Server Room A</SelectItem>
              <SelectItem value="2">Containment 2 - Server Room B</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Scenarios */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={setNormalScenario}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Normal
          </Button>
          <Button variant="outline" size="sm" onClick={setEmergencyScenario}>
            <AlertTriangle className="h-4 w-4 mr-1" />
            Emergency
          </Button>
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>

        {/* Status Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(testData).map(([key, value]) => {
            if (key === "Timestamp") return null;
            
            return (
              <div key={key} className="flex items-center justify-between space-x-2">
                <Label htmlFor={key} className="text-sm flex-1">
                  {key}
                </Label>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={value ? "default" : "secondary"}
                    className={`text-xs ${getStatusColor(key, value as boolean)}`}
                  >
                    {value ? "ON" : "OFF"}
                  </Badge>
                  <Switch
                    id={key}
                    checked={value as boolean}
                    onCheckedChange={(checked) => updateTestData(key, checked)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Timestamp Display */}
        <div className="text-sm text-muted-foreground">
          <strong>Timestamp:</strong> {testData.Timestamp}
        </div>

        {/* Send Button */}
        <Button 
          onClick={sendTestData} 
          disabled={loading}
          className="w-full"
        >
          <Send className={`h-4 w-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? "Sending..." : "Send Test Data"}
        </Button>

        {/* JSON Preview */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium mb-2">
            JSON Payload Preview
          </summary>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {JSON.stringify(testData, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}