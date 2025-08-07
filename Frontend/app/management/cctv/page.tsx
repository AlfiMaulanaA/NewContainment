"use client";

import React, { useState, useEffect } from 'react';
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CctvCamera, 
  CreateCctvCameraRequest, 
  UpdateCctvCameraRequest,
  CctvStreamType,
  CctvStreamProtocol,
  CctvResolution,
  cctvApi,
  containmentsApi,
  racksApi,
  Containment,
  Rack
} from '@/lib/api-service';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  TestTube, 
  Camera,
  RefreshCw,
  Search,
  Filter,
  Download,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function CctvManagementPage() {
  console.log('🎬 CctvManagementPage component rendered');
  
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [containments, setContainments] = useState<Containment[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CctvCamera | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const { user } = useAuth();

  console.log('📹 Current cameras state:', cameras);

  const [formData, setFormData] = useState<CreateCctvCameraRequest>({
    name: '',
    description: '',
    streamUrl: '',
    snapshotUrl: '',
    streamType: CctvStreamType.Live,
    protocol: CctvStreamProtocol.HTTP,
    username: '',
    password: '',
    port: undefined,
    location: '',
    containmentId: undefined,
    rackId: undefined,
    resolution: CctvResolution.HD720p,
    frameRate: 30,
    showDashboard: false
  });

  useEffect(() => {
    console.log('🔄 useEffect triggered, calling loadData...');
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [camerasResult, containmentsResult, racksResult] = await Promise.all([
        cctvApi.getAllCameras(),
        containmentsApi.getContainments(),
        racksApi.getRacks()
      ]);

      console.log('CCTV API Response:', camerasResult);
      console.log('Containments API Response:', containmentsResult);
      console.log('Racks API Response:', racksResult);

      if (camerasResult.success && camerasResult.data) {
        console.log('Setting cameras:', camerasResult.data);
        setCameras(camerasResult.data);
      } else {
        console.error('Camera API failed:', camerasResult);
        toast.error(`Failed to load cameras: ${camerasResult.message || 'Unknown error'}`);
      }
      if (containmentsResult.success && containmentsResult.data) {
        setContainments(containmentsResult.data);
      } else {
        console.error('Containments API failed:', containmentsResult);
      }
      if (racksResult.success && racksResult.data) {
        setRacks(racksResult.data);
      } else {
        console.error('Racks API failed:', racksResult);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCamera) {
        const result = await cctvApi.updateCamera(editingCamera.id, formData as UpdateCctvCameraRequest);
        if (result.success) {
          toast.success('Camera updated successfully');
          loadData();
        } else {
          toast.error(result.message || 'Failed to update camera');
        }
      } else {
        const result = await cctvApi.createCamera(formData);
        if (result.success) {
          toast.success('Camera created successfully');
          loadData();
        } else {
          toast.error(result.message || 'Failed to create camera');
        }
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Error saving camera');
    }
  };

  const handleEdit = (camera: CctvCamera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      description: camera.description || '',
      streamUrl: camera.streamUrl,
      snapshotUrl: camera.snapshotUrl || '',
      streamType: camera.streamType,
      protocol: camera.protocol,
      username: '',
      password: '',
      port: camera.port,
      location: camera.location,
      containmentId: camera.containmentId,
      rackId: camera.rackId,
      resolution: camera.resolution,
      frameRate: camera.frameRate,
      showDashboard: camera.showDashboard
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await cctvApi.deleteCamera(id);
      if (result.success) {
        toast.success('Camera deleted successfully');
        loadData();
      } else {
        toast.error(result.message || 'Failed to delete camera');
      }
    } catch (error) {
      toast.error('Error deleting camera');
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      const result = await cctvApi.testCameraConnection(id);
      if (result.success && result.data) {
        toast.success(result.data.message);
        loadData(); // Refresh to get updated status
      } else {
        toast.error(result.message || 'Connection test failed');
      }
    } catch (error) {
      toast.error('Error testing connection');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      streamUrl: '',
      snapshotUrl: '',
      streamType: CctvStreamType.Live,
      protocol: CctvStreamProtocol.HTTP,
      username: '',
      password: '',
      port: undefined,
      location: '',
      containmentId: undefined,
      rackId: undefined,
      resolution: CctvResolution.HD720p,
      frameRate: 30,
      showDashboard: false
    });
    setEditingCamera(null);
  };

  const filteredCameras = cameras.filter(camera => {
    const matchesSearch = camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         camera.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' && camera.isOnline) ||
                         (statusFilter === 'offline' && !camera.isOnline);
    return matchesSearch && matchesStatus;
  });

  const getProtocolName = (protocol: CctvStreamProtocol) => {
    const names = {
      [CctvStreamProtocol.RTSP]: 'RTSP',
      [CctvStreamProtocol.HTTP]: 'HTTP',
      [CctvStreamProtocol.HTTPS]: 'HTTPS',
      [CctvStreamProtocol.WebRTC]: 'WebRTC',
      [CctvStreamProtocol.HLS]: 'HLS',
      [CctvStreamProtocol.MJPEG]: 'MJPEG',
    };
    return names[protocol] || 'Unknown';
  };

  const getResolutionName = (resolution: CctvResolution) => {
    const names = {
      [CctvResolution.QVGA]: 'QVGA (320x240)',
      [CctvResolution.VGA]: 'VGA (640x480)',
      [CctvResolution.HD720p]: 'HD 720p (1280x720)',
      [CctvResolution.HD1080p]: 'HD 1080p (1920x1080)',
      [CctvResolution.UHD4K]: '4K UHD (3840x2160)',
    };
    return names[resolution] || 'Unknown';
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <h1 className="text-lg font-semibold">CCTV Management</h1>
        </div>
        <div className="ml-auto">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCamera ? 'Edit Camera' : 'Add New Camera'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Camera Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocol">Protocol *</Label>
                  <Select 
                    value={formData.protocol.toString()} 
                    onValueChange={(value) => setFormData({...formData, protocol: parseInt(value) as CctvStreamProtocol})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CctvStreamProtocol.HTTP.toString()}>HTTP</SelectItem>
                      <SelectItem value={CctvStreamProtocol.HTTPS.toString()}>HTTPS</SelectItem>
                      <SelectItem value={CctvStreamProtocol.RTSP.toString()}>RTSP</SelectItem>
                      <SelectItem value={CctvStreamProtocol.HLS.toString()}>HLS</SelectItem>
                      <SelectItem value={CctvStreamProtocol.MJPEG.toString()}>MJPEG</SelectItem>
                      <SelectItem value={CctvStreamProtocol.WebRTC.toString()}>WebRTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port || ''}
                    onChange={(e) => setFormData({...formData, port: e.target.value ? parseInt(e.target.value) : undefined})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="streamUrl">Stream URL *</Label>
                <Input
                  id="streamUrl"
                  value={formData.streamUrl}
                  onChange={(e) => setFormData({...formData, streamUrl: e.target.value})}
                  placeholder="rtsp://192.168.1.100:554/stream1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="snapshotUrl">Snapshot URL</Label>
                <Input
                  id="snapshotUrl"
                  value={formData.snapshotUrl}
                  onChange={(e) => setFormData({...formData, snapshotUrl: e.target.value})}
                  placeholder="http://192.168.1.100/snapshot.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="containment">Containment</Label>
                  <Select 
                    value={formData.containmentId?.toString() || ''} 
                    onValueChange={(value) => setFormData({...formData, containmentId: value ? parseInt(value) : undefined})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select containment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {containments.map(containment => (
                        <SelectItem key={containment.id} value={containment.id.toString()}>
                          {containment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="rack">Rack</Label>
                  <Select 
                    value={formData.rackId?.toString() || ''} 
                    onValueChange={(value) => setFormData({...formData, rackId: value ? parseInt(value) : undefined})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rack" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {racks.map(rack => (
                        <SelectItem key={rack.id} value={rack.id.toString()}>
                          {rack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select 
                    value={formData.resolution.toString()} 
                    onValueChange={(value) => setFormData({...formData, resolution: parseInt(value) as CctvResolution})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CctvResolution.QVGA.toString()}>QVGA (320x240)</SelectItem>
                      <SelectItem value={CctvResolution.VGA.toString()}>VGA (640x480)</SelectItem>
                      <SelectItem value={CctvResolution.HD720p.toString()}>HD 720p (1280x720)</SelectItem>
                      <SelectItem value={CctvResolution.HD1080p.toString()}>HD 1080p (1920x1080)</SelectItem>
                      <SelectItem value={CctvResolution.UHD4K.toString()}>4K UHD (3840x2160)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="frameRate">Frame Rate (fps)</Label>
                  <Input
                    id="frameRate"
                    type="number"
                    min="1"
                    max="60"
                    value={formData.frameRate}
                    onChange={(e) => setFormData({...formData, frameRate: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showDashboard"
                  checked={formData.showDashboard || false}
                  onCheckedChange={(checked) => setFormData({...formData, showDashboard: checked})}
                />
                <Label htmlFor="showDashboard" className="text-sm font-medium">
                  Show in Dashboard Widget
                </Label>
                <div className="text-xs text-gray-500 ml-2">
                  Enable this camera to be displayed as a widget in the main dashboard
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCamera ? 'Update Camera' : 'Create Camera'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-muted-foreground">Manage and monitor security cameras</p>

        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cameras ({filteredCameras.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search cameras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Containment</TableHead>
                <TableHead>Dashboard</TableHead>
                <TableHead>Last Online</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCameras.map((camera) => (
                <TableRow key={camera.id}>
                  <TableCell>
                    <Badge variant={camera.isOnline ? "default" : "destructive"}>
                      {camera.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{camera.name}</TableCell>
                  <TableCell>{camera.location}</TableCell>
                  <TableCell>{getProtocolName(camera.protocol)}</TableCell>
                  <TableCell>{getResolutionName(camera.resolution)}</TableCell>
                  <TableCell>{camera.containmentName || camera.rackName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={camera.showDashboard ? "default" : "secondary"} className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {camera.showDashboard ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {camera.lastOnlineAt 
                      ? new Date(camera.lastOnlineAt).toLocaleString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTestConnection(camera.id)}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(camera)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Camera</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{camera.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(camera.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCameras.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-500">No cameras found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
      </SidebarInset>
  );
}