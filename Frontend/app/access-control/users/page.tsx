"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw,
  Search,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  AccessControlDevice,
  AccessControlUser,
  AccessControlUserPrivilege,
  CreateAccessControlUserRequest,
  UpdateAccessControlUserRequest,
  accessControlApi 
} from '@/lib/api-service';
import { DeveloperModeGuard } from '@/components/developer-mode-guard';

export default function AccessControlUsersPage() {
  const [devices, setDevices] = useState<AccessControlDevice[]>([]);
  const [users, setUsers] = useState<AccessControlUser[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccessControlUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateAccessControlUserRequest>({
    device_id: '',
    user_data: {
      uid: 0,
      name: '',
      privilege: AccessControlUserPrivilege.User,
      password: '',
      group_id: '',
      user_id: '',
      card: undefined
    }
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
        toast.success(result.data.message);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDevice) {
      toast.error('Please select a device first');
      return;
    }

    try {
      const requestData = {
        ...formData,
        device_id: selectedDevice
      };

      if (editingUser) {
        const result = await accessControlApi.updateUser(editingUser.uid.toString(), requestData);
        if (result.success) {
          toast.success(result.data?.message || 'User updated successfully');
          loadUsers();
        } else {
          toast.error(result.message || 'Failed to update user');
        }
      } else {
        const result = await accessControlApi.createUser(requestData);
        if (result.success) {
          toast.success(result.data?.message || 'User created successfully');
          loadUsers();
        } else {
          toast.error(result.message || 'Failed to create user');
        }
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Error saving user');
    }
  };

  const handleEdit = (user: AccessControlUser) => {
    setEditingUser(user);
    setFormData({
      device_id: selectedDevice,
      user_data: {
        uid: user.uid,
        name: user.name,
        privilege: user.privilege,
        password: '', // Don't show existing password
        group_id: user.group_id || '',
        user_id: user.user_id || '',
        card: user.card
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (user: AccessControlUser) => {
    try {
      const result = await accessControlApi.deleteUser(selectedDevice, user.uid.toString());
      if (result.success) {
        toast.success(result.data?.message || 'User deleted successfully');
        loadUsers();
      } else {
        toast.error(result.message || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  const resetForm = () => {
    setFormData({
      device_id: '',
      user_data: {
        uid: 0,
        name: '',
        privilege: AccessControlUserPrivilege.User,
        password: '',
        group_id: '',
        user_id: '',
        card: undefined
      }
    });
    setEditingUser(null);
  };

  const getPrivilegeName = (privilege: AccessControlUserPrivilege) => {
    switch (privilege) {
      case AccessControlUserPrivilege.User: return 'User';
      case AccessControlUserPrivilege.Enroller: return 'Enroller';
      case AccessControlUserPrivilege.Administrator: return 'Administrator';
      default: return 'Unknown';
    }
  };

  const getPrivilegeIcon = (privilege: AccessControlUserPrivilege) => {
    switch (privilege) {
      case AccessControlUserPrivilege.Administrator: return <ShieldAlert className="h-4 w-4" />;
      case AccessControlUserPrivilege.Enroller: return <ShieldCheck className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getPrivilegeColor = (privilege: AccessControlUserPrivilege) => {
    switch (privilege) {
      case AccessControlUserPrivilege.Administrator: return 'bg-red-500 hover:bg-red-600';
      case AccessControlUserPrivilege.Enroller: return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDeviceInfo = devices.find(d => d.id === selectedDevice);

  return (
    <DeveloperModeGuard>
      <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Access Control Users</h1>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Manage users on ZKTeco access control devices</p>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={!selectedDevice}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="uid">User ID (UID) *</Label>
                <Input
                  id="uid"
                  type="number"
                  value={formData.user_data.uid}
                  onChange={(e) => setFormData({
                    ...formData,
                    user_data: { ...formData.user_data, uid: parseInt(e.target.value) || 0 }
                  })}
                  required
                  disabled={!!editingUser}
                />
              </div>
              
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.user_data.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    user_data: { ...formData.user_data, name: e.target.value }
                  })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="privilege">Privilege *</Label>
                <Select 
                  value={formData.user_data.privilege.toString()} 
                  onValueChange={(value) => setFormData({
                    ...formData,
                    user_data: { ...formData.user_data, privilege: parseInt(value) as AccessControlUserPrivilege }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AccessControlUserPrivilege.User.toString()}>User</SelectItem>
                    <SelectItem value={AccessControlUserPrivilege.Enroller.toString()}>Enroller</SelectItem>
                    <SelectItem value={AccessControlUserPrivilege.Administrator.toString()}>Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.user_data.password}
                  onChange={(e) => setFormData({
                    ...formData,
                    user_data: { ...formData.user_data, password: e.target.value }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="card">Card Number</Label>
                <Input
                  id="card"
                  type="number"
                  value={formData.user_data.card || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    user_data: { ...formData.user_data, card: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              <Button variant="outline" onClick={loadUsers} disabled={!selectedDevice}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading users...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Privilege</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.uid}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Badge className={getPrivilegeColor(user.privilege)}>
                          {getPrivilegeIcon(user.privilege)}
                          <span className="ml-1">{getPrivilegeName(user.privilege)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{user.user_id || '-'}</TableCell>
                      <TableCell>{user.card || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(user)}
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
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete user "{user.name}" (UID: {user.uid})? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-gray-400" />
                          <p className="text-gray-500">
                            {selectedDevice ? 'No users found' : 'Please select a device first'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      </SidebarInset>
    </DeveloperModeGuard>
  );
}