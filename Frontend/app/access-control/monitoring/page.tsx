"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  RefreshCw,
  UserCheck,
  Users,
  Clock,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  AccessControlDevice,
  AccessControlUser,
  AccessControlAttendance,
  accessControlApi 
} from '@/lib/api-service';
import { DeveloperModeGuard } from '@/components/developer-mode-guard';

export default function AccessControlMonitoringPage() {
  const [devices, setDevices] = useState<AccessControlDevice[]>([]);
  const [users, setUsers] = useState<AccessControlUser[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AccessControlAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadUsers();
    }
  }, [selectedDevice]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring && selectedDevice) {
      // Poll for live attendance every 2 seconds
      interval = setInterval(() => {
        fetchLiveAttendance();
      }, 2000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, selectedDevice]);

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
        setUsers([]);
      }
    } catch (error) {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveAttendance = async () => {
    if (!selectedDevice) return;
    
    try {
      const result = await accessControlApi.getLiveAttendance(selectedDevice);
      
      if (result.success && result.data?.data) {
        const newRecords = result.data.data;
        
        // Add new records to the beginning of the list
        setAttendanceRecords(prev => {
          const updatedRecords = [...newRecords, ...prev];
          // Keep only last 50 records for performance
          return updatedRecords.slice(0, 50);
        });
        
        setLastUpdate(new Date());
      }
    } catch (error) {
      // Silently handle errors during live monitoring
      console.error('Error fetching live attendance:', error);
    }
  };

  const startMonitoring = () => {
    if (!selectedDevice) {
      toast.error('Please select a device first');
      return;
    }
    
    setIsMonitoring(true);
    setAttendanceRecords([]); // Clear previous records
    toast.success('Live monitoring started');
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    toast.info('Live monitoring stopped');
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.uid.toString() === userId || u.user_id === userId);
    return user ? user.name : `Unknown User (${userId})`;
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Check In';
      case 1: return 'Check Out';
      case 2: return 'Break Out';
      case 3: return 'Break In';
      case 4: return 'Overtime In';
      case 5: return 'Overtime Out';
      default: return `Status ${status}`;
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0: return <LogIn className="h-4 w-4 text-green-500" />;
      case 1: return <LogOut className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-green-500 hover:bg-green-600';
      case 1: return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const selectedDeviceInfo = devices.find(d => d.id === selectedDevice);
  const todayRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.timestamp);
    const today = new Date();
    return recordDate.toDateString() === today.toDateString();
  });

  return (
    <DeveloperModeGuard>
      <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access Control Monitoring</h1>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Real-time attendance and access monitoring</p>
          
          <div className="flex items-center gap-2">
            {isMonitoring ? (
              <Button onClick={stopMonitoring} variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Stop Monitoring
              </Button>
            ) : (
              <Button onClick={startMonitoring} disabled={!selectedDevice}>
                <Play className="h-4 w-4 mr-2" />
                Start Monitoring
              </Button>
            )}
            
            <Button variant="outline" onClick={loadUsers} disabled={!selectedDevice}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
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
            
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? "default" : "secondary"}>
                {isMonitoring ? 'Monitoring' : 'Stopped'}
              </Badge>
              
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Records</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayRecords.length}</div>
            <p className="text-xs text-muted-foreground">Attendance records today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check Ins</CardTitle>
            <LogIn className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todayRecords.filter(r => r.status === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Today's check-ins</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check Outs</CardTitle>
            <LogOut className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {todayRecords.filter(r => r.status === 1).length}
            </div>
            <p className="text-xs text-muted-foreground">Today's check-outs</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Attendance Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Attendance Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              {isMonitoring && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600">Live</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isMonitoring && attendanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Live Monitoring Stopped</h3>
              <p className="text-gray-500 mb-4">Click "Start Monitoring" to begin real-time attendance tracking</p>
              <Button onClick={startMonitoring} disabled={!selectedDevice}>
                <Play className="h-4 w-4 mr-2" />
                Start Live Monitoring
              </Button>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Waiting for Activity</h3>
              <p className="text-gray-500">Monitoring for new attendance records...</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-600">Monitoring active</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {attendanceRecords.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full">
                      {getStatusIcon(record.status)}
                    </div>
                    <div>
                      <div className="font-semibold">{getUserName(record.user_id)}</div>
                      <div className="text-sm text-gray-500">User ID: {record.user_id}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getStatusColor(record.status)}>
                      {getStatusText(record.status)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Status */}
      {selectedDeviceInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection Status:</span>
                  <div className="flex items-center gap-2">
                    {selectedDeviceInfo.isConnected ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Connected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">Disconnected</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Device Name:</span>
                  <span className="text-sm">{selectedDeviceInfo.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">IP Address:</span>
                  <span className="text-sm font-mono">{selectedDeviceInfo.ip}:{selectedDeviceInfo.port}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Location:</span>
                  <span className="text-sm">{selectedDeviceInfo.location}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monitoring Status:</span>
                  <Badge variant={isMonitoring ? "default" : "secondary"}>
                    {isMonitoring ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Update:</span>
                  <span className="text-sm">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
      </SidebarInset>
    </DeveloperModeGuard>
  );
}