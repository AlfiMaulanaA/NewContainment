"use client";

import { useState, useEffect } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Send,
  TestTube,
  Phone,
  User,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { whatsAppApi } from "@/lib/api-service";

interface WhatsAppStatus {
  serviceAvailable: boolean;
  lastChecked: string;
  provider: string;
  apiEndpoint: string;
}

interface MessageHistory {
  id: string;
  phoneNumber: string;
  recipientName: string;
  message: string;
  status: "success" | "failed" | "pending";
  sentAt: string;
  type: "manual" | "template" | "test";
}

export default function WhatsAppManagementPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  
  // Manual Message Form
  const [manualForm, setManualForm] = useState({
    phoneNumber: "",
    recipientName: "",
    message: ""
  });
  
  // Test Message Form
  const [testForm, setTestForm] = useState({
    phoneNumber: "",
    recipientName: ""
  });

  // Template Message Form
  const [templateForm, setTemplateForm] = useState({
    phoneNumber: "",
    recipientName: "",
    templateId: "",
    parameters: ""
  });

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const result = await whatsAppApi.getStatus();
      if (result.success && result.data) {
        setStatus(result.data);
      } else {
        toast.error(result.message || "Failed to load WhatsApp service status");
      }
    } catch (error) {
      console.error("Error loading WhatsApp status:", error);
      toast.error("Failed to load WhatsApp service status");
    }
  };

  const sendManualMessage = async () => {
    if (!manualForm.phoneNumber || !manualForm.message) {
      toast.error("Phone number and message are required");
      return;
    }

    setLoading(true);
    try {
      const result = await whatsAppApi.sendMessage({
        phoneNumber: manualForm.phoneNumber,
        recipientName: manualForm.recipientName || "User",
        message: manualForm.message
      });
      
      if (result.success) {
        toast.success("Message sent successfully!");
        
        // Add to message history
        const newMessage: MessageHistory = {
          id: Date.now().toString(),
          phoneNumber: manualForm.phoneNumber,
          recipientName: manualForm.recipientName || "User",
          message: manualForm.message,
          status: "success",
          sentAt: new Date().toISOString(),
          type: "manual"
        };
        setMessageHistory(prev => [newMessage, ...prev]);
        
        // Reset form
        setManualForm({ phoneNumber: "", recipientName: "", message: "" });
      } else {
        toast.error(result.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("An error occurred while sending the message");
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testForm.phoneNumber) {
      toast.error("Phone number is required for test message");
      return;
    }

    setLoading(true);
    try {
      const result = await whatsAppApi.sendTestMessage({
        phoneNumber: testForm.phoneNumber,
        recipientName: testForm.recipientName || "Test User"
      });
      
      if (result.success) {
        toast.success("Test message sent successfully!");
        
        // Add to message history
        const newMessage: MessageHistory = {
          id: Date.now().toString(),
          phoneNumber: testForm.phoneNumber,
          recipientName: testForm.recipientName || "Test User",
          message: result.data?.testMessage || `Test message sent at ${new Date().toLocaleString()}`,
          status: "success",
          sentAt: new Date().toISOString(),
          type: "test"
        };
        setMessageHistory(prev => [newMessage, ...prev]);
        
        // Reset form
        setTestForm({ phoneNumber: "", recipientName: "" });
      } else {
        toast.error(result.message || "Failed to send test message");
      }
    } catch (error) {
      console.error("Error sending test message:", error);
      toast.error("An error occurred while sending the test message");
    } finally {
      setLoading(false);
    }
  };

  const sendTemplateMessage = async () => {
    if (!templateForm.phoneNumber || !templateForm.templateId) {
      toast.error("Phone number and template ID are required");
      return;
    }

    setLoading(true);
    try {
      let parameters = {};
      if (templateForm.parameters) {
        try {
          parameters = JSON.parse(templateForm.parameters);
        } catch (e) {
          toast.error("Invalid JSON format in parameters");
          setLoading(false);
          return;
        }
      }

      const result = await whatsAppApi.sendTemplateMessage({
        phoneNumber: templateForm.phoneNumber,
        recipientName: templateForm.recipientName || "User",
        templateId: templateForm.templateId,
        parameters: parameters
      });
      
      if (result.success) {
        toast.success("Template message sent successfully!");
        
        // Add to message history
        const newMessage: MessageHistory = {
          id: Date.now().toString(),
          phoneNumber: templateForm.phoneNumber,
          recipientName: templateForm.recipientName || "User",
          message: `Template: ${templateForm.templateId}`,
          status: "success",
          sentAt: new Date().toISOString(),
          type: "template"
        };
        setMessageHistory(prev => [newMessage, ...prev]);
        
        // Reset form
        setTemplateForm({ phoneNumber: "", recipientName: "", templateId: "", parameters: "" });
      } else {
        toast.error(result.message || "Failed to send template message");
      }
    } catch (error) {
      console.error("Error sending template message:", error);
      toast.error("An error occurred while sending the template message");
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    return phoneNumber.startsWith("62") ? `+${phoneNumber}` : phoneNumber;
  };

  const getStatusIcon = (status: "success" | "failed" | "pending") => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeColor = (type: "manual" | "template" | "test") => {
    switch (type) {
      case "manual":
        return "bg-blue-100 text-blue-800";
      case "template":
        return "bg-purple-100 text-purple-800";
      case "test":
        return "bg-green-100 text-green-800";
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">WhatsApp Management</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Service Status Card */}
        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge variant={status.serviceAvailable ? "default" : "secondary"} className="w-fit">
                    {status.serviceAvailable ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm text-muted-foreground">Provider</Label>
                  <span className="font-medium">{status.provider}</span>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm text-muted-foreground">Endpoint</Label>
                  <span className="font-mono text-sm text-muted-foreground">{status.apiEndpoint}</span>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm text-muted-foreground">Last Checked</Label>
                  <span className="text-sm">{new Date(status.lastChecked).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Message Forms */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="manual">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manual">Manual Message</TabsTrigger>
                    <TabsTrigger value="template">Template Message</TabsTrigger>
                    <TabsTrigger value="test">Test Message</TabsTrigger>
                  </TabsList>

                  {/* Manual Message Tab */}
                  <TabsContent value="manual" className="space-y-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="manual-phone">Phone Number *</Label>
                          <div className="flex">
                            <Phone className="h-4 w-4 mt-3 mr-2 text-muted-foreground" />
                            <Input
                              id="manual-phone"
                              placeholder="6281234567890"
                              value={manualForm.phoneNumber}
                              onChange={(e) => setManualForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., 62 for Indonesia)</p>
                        </div>
                        <div>
                          <Label htmlFor="manual-name">Recipient Name</Label>
                          <div className="flex">
                            <User className="h-4 w-4 mt-3 mr-2 text-muted-foreground" />
                            <Input
                              id="manual-name"
                              placeholder="John Doe"
                              value={manualForm.recipientName}
                              onChange={(e) => setManualForm(prev => ({ ...prev, recipientName: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="manual-message">Message *</Label>
                        <Textarea
                          id="manual-message"
                          placeholder="Type your message here..."
                          rows={4}
                          value={manualForm.message}
                          onChange={(e) => setManualForm(prev => ({ ...prev, message: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{manualForm.message.length} characters</p>
                      </div>
                      <Button onClick={sendManualMessage} disabled={loading} className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Template Message Tab */}
                  <TabsContent value="template" className="space-y-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="template-phone">Phone Number *</Label>
                          <Input
                            id="template-phone"
                            placeholder="6281234567890"
                            value={templateForm.phoneNumber}
                            onChange={(e) => setTemplateForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-name">Recipient Name</Label>
                          <Input
                            id="template-name"
                            placeholder="John Doe"
                            value={templateForm.recipientName}
                            onChange={(e) => setTemplateForm(prev => ({ ...prev, recipientName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="template-id">Template ID *</Label>
                        <Input
                          id="template-id"
                          placeholder="300d84f2-d962-4451-bc27-870fb99d18e7"
                          value={templateForm.templateId}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, templateId: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-params">Parameters (JSON)</Label>
                        <Textarea
                          id="template-params"
                          placeholder='{"full_name": "John Doe", "messagetext": "Hello World"}'
                          rows={3}
                          value={templateForm.parameters}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, parameters: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Optional: JSON object with template parameters</p>
                      </div>
                      <Button onClick={sendTemplateMessage} disabled={loading} className="w-full">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Template Message
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Test Message Tab */}
                  <TabsContent value="test" className="space-y-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="test-phone">Phone Number *</Label>
                          <Input
                            id="test-phone"
                            placeholder="6281234567890"
                            value={testForm.phoneNumber}
                            onChange={(e) => setTestForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="test-name">Recipient Name</Label>
                          <Input
                            id="test-name"
                            placeholder="Test User"
                            value={testForm.recipientName}
                            onChange={(e) => setTestForm(prev => ({ ...prev, recipientName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          This will send a test message with current timestamp to verify the WhatsApp service is working properly.
                        </p>
                      </div>
                      <Button onClick={sendTestMessage} disabled={loading} className="w-full">
                        <TestTube className="h-4 w-4 mr-2" />
                        Send Test Message
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Message History */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {messageHistory.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {messageHistory.slice(0, 10).map((msg) => (
                      <div key={msg.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(msg.status)}
                            <Badge className={getTypeColor(msg.type)}>
                              {msg.type}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.sentAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3" />
                            <span>{formatPhoneNumber(msg.phoneNumber)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3" />
                            <span>{msg.recipientName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages sent yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}