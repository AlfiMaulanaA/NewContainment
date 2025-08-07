"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { 
  Fingerprint, 
  CreditCard, 
  RefreshCw,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  AccessControlDevice,
  AccessControlUser,
  RegisterFingerprintRequest,
  RegisterCardRequest,
  accessControlApi 
} from '@/lib/api-service';
import { DeveloperModeGuard } from '@/components/developer-mode-guard';

export default function BiometricRegistrationPage() {
  const [devices, setDevices] = useState<AccessControlDevice[]>([]);
  const [users, setUsers] = useState<AccessControlUser[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Fingerprint form 
  
  const [fingerprintData, setFingerprintData] = useState<RegisterFingerprintRequest>({
    device_id: '',
    user_id: '',
    finger_id: 0,
    template_data: ''
  });

  // Card form data
  const [cardData, setCardData] = useState<RegisterCardRequest>({
    device_id: '',
    user_id: '',
    card_number: ''
  });

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadUsers();
    }
  }, [selectedDevice]);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const result = await accessControlApi.getDevices();
      
      if (result.success && result.data) {
        setDevices(result.data);
        // Auto-select first enabled device
        const firstEnabled = result.data.find(d => d.enabled);
        if (firstEnabled) {
          setSelectedDevice(firstEnabled.id);
        }
      } else {
        toast.error('Failed to load devices');
      }
    } catch (error) {
      toast.error('Error loading devices');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!selectedDevice) return;
    
    try {
      setIsLoading(true);
      const result = await accessControlApi.getAllUsers(selectedDevice);
      
      if (result.success && result.data?.data) {
        setUsers(result.data.data);
      } else {
        toast.error('Failed to load users');
        setUsers([]);
      }
    } catch (error) {
      toast.error('Error loading users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFingerprintRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDevice) {
      toast.error('Please select a device first');
      return;
    }

    try {
      setIsRegistering(true);
      
      const requestData = {
        ...fingerprintData,
        device_id: selectedDevice
      };

      const result = await accessControlApi.registerFingerprint(requestData);
      
      if (result.success && result.data) {
        toast.success(result.data.message);
        
        // Reset form
        setFingerprintData({
          device_id: '',
          user_id: '',
          finger_id: 0,
          template_data: ''
        });
      } else {
        toast.error(result.message || 'Failed to register fingerprint');
      }
    } catch (error) {
      toast.error('Error registering fingerprint');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCardRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDevice) {
      toast.error('Please select a device first');
      return;
    }

    try {
      setIsRegistering(true);
      
      const requestData = {
        ...cardData,
        device_id: selectedDevice
      };

      const result = await accessControlApi.registerCard(requestData);
      
      if (result.success && result.data) {
        toast.success(result.data.message);
        
        // Reset form
        setCardData({
          device_id: '',
          user_id: '',
          card_number: ''
        });
      } else {
        toast.error(result.message || 'Failed to register card');
      }
    } catch (error) {
      toast.error('Error registering card');
    } finally {
      setIsRegistering(false);
    }
  };

  const selectedDeviceInfo = devices.find(d => d.id === selectedDevice);

  return (
    <DeveloperModeGuard>
      <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Biometric Registration</h1>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Register fingerprints and cards for access control users</p>
          
          <Button variant="outline" onClick={loadUsers} disabled={!selectedDevice}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Device Selection */}
        <Card>
        <CardHeader>
          <CardTitle>Select Device</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an access control device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.filter(d => d.enabled).map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name} ({device.ip})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedDeviceInfo && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="text-sm">
                <strong>Selected Device:</strong> {selectedDeviceInfo.name}
                <br />
                <strong>Location:</strong> {selectedDeviceInfo.location}
                <br />
                <strong>Status:</strong> {selectedDeviceInfo.isConnected ? 
                  <Badge className="ml-1 bg-green-500">Connected</Badge> : 
                  <Badge variant="destructive" className="ml-1">Disconnected</Badge>
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Forms */}
      <Card>
        <CardHeader>
          <CardTitle>Biometric Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fingerprint" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fingerprint" className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                Fingerprint
              </TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Access Card
              </TabsTrigger>
            </TabsList>
            
            {/* Fingerprint Registration */}
            <TabsContent value="fingerprint">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Fingerprint Registration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFingerprintRegistration} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fp-user">Select User *</Label>
                        <Select 
                          value={fingerprintData.user_id} 
                          onValueChange={(value) => setFingerprintData({
                            ...fingerprintData,
                            user_id: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.uid} value={user.uid.toString()}>
                                {user.name} (UID: {user.uid})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="finger-id">Finger ID *</Label>
                        <Select 
                          value={fingerprintData.finger_id.toString()} 
                          onValueChange={(value) => setFingerprintData({
                            ...fingerprintData,
                            finger_id: parseInt(value)
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                Finger {i} {i === 0 ? '(Right Thumb)' : i === 1 ? '(Right Index)' : i === 5 ? '(Left Thumb)' : i === 6 ? '(Left Index)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="text-sm text-blue-700">
                          <strong>Instructions:</strong>
                          <ol className="mt-2 list-decimal list-inside space-y-1">
                            <li>Select the user and finger position</li>
                            <li>Click "Start Registration" to send command to device</li>
                            <li>Follow instructions on the ZKTeco device to scan fingerprint</li>
                            <li>The device will guide you through multiple scans for better accuracy</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="submit"
                        disabled={!selectedDevice || !fingerprintData.user_id || isRegistering}
                        className="flex items-center gap-2"
                      >
                        {isRegistering ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Start Registration
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Card Registration */}
            <TabsContent value="card">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Access Card Registration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCardRegistration} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="card-user">Select User *</Label>
                        <Select 
                          value={cardData.user_id} 
                          onValueChange={(value) => setCardData({
                            ...cardData,
                            user_id: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.uid} value={user.uid.toString()}>
                                {user.name} (UID: {user.uid})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="card-number">Card Number *</Label>
                        <Input
                          id="card-number"
                          type="number"
                          placeholder="Enter card number"
                          value={cardData.card_number}
                          onChange={(e) => setCardData({
                            ...cardData,
                            card_number: e.target.value
                          })}
                          required
                        />
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div className="text-sm text-green-700">
                          <strong>Instructions:</strong>
                          <ol className="mt-2 list-decimal list-inside space-y-1">
                            <li>Select the user from the dropdown</li>
                            <li>Enter the card number (usually printed on the card)</li>
                            <li>Click "Register Card" to assign the card to the user</li>
                            <li>The card will be immediately available for access</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="submit"
                        disabled={!selectedDevice || !cardData.user_id || !cardData.card_number || isRegistering}
                        className="flex items-center gap-2"
                      >
                        {isRegistering ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Register Card
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Current User List */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading users...</span>
            </div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <Card key={user.uid} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-sm text-gray-500">UID: {user.uid}</div>
                      {user.card && (
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CreditCard className="h-3 w-3" />
                          Card: {user.card}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">
                {selectedDevice ? 'No users found. Create users first.' : 'Please select a device first.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </SidebarInset>
    </DeveloperModeGuard>
  );
}