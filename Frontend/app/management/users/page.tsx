"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, Edit, Trash2, ArrowUpDown, UserCheck, UserX, Search, Upload, Camera, X } from "lucide-react";
import { User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usersApi, userPhotoApi, User, UserRole, CreateUserRequest, UpdateUserRequest } from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { getRoleDisplayName, getRoleColor } from "@/lib/auth-utils";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateUserRequest | UpdateUserRequest>({
    name: "",
    email: "",
    phoneNumber: "",
    role: UserRole.User,
  });

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } = useSortableTable(users);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(sorted, [
    "name",
    "email",
    "phoneNumber",
  ]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminUsers = users.filter(user => user.role === UserRole.Admin).length;
  const developerUsers = users.filter(user => user.role === UserRole.Developer).length;
  const regularUsers = users.filter(user => user.role === UserRole.User).length;

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await usersApi.getUsers();
      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        toast.error(result.message || "Failed to load users");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phoneNumber: "",
      role: UserRole.User,
    });
    setEditingUser(null);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Handle create user
  const handleCreateUser = async () => {
    setActionLoading(true);
    try {
      const result = await usersApi.createUser(formData as CreateUserRequest);
      if (result.success) {
        toast.success("User created successfully");
        setShowCreateDialog(false);
        resetForm();
        loadUsers();
      } else {
        toast.error(result.message || "Failed to create user");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating user");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      role: user.role,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowEditDialog(true);
  };

  // Handle update user
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    setActionLoading(true);
    try {
      const result = await usersApi.updateUser(editingUser.id, formData as UpdateUserRequest);
      if (result.success) {
        toast.success("User updated successfully");
        setShowEditDialog(false);
        resetForm();
        loadUsers();
      } else {
        toast.error(result.message || "Failed to update user");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating user");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: number) => {
    setActionLoading(true);
    try {
      const result = await usersApi.deleteUser(userId);
      if (result.success) {
        toast.success("User deleted successfully");
        loadUsers();
      } else {
        toast.error(result.message || "Failed to delete user");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting user");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload JPG, PNG, or GIF files only.');
        return;
      }

      if (file.size > maxSize) {
        toast.error('File size too large. Please upload files under 5MB.');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (userId: number) => {
    if (!selectedFile) return;

    setUploadingPhoto(true);
    try {
      const result = await userPhotoApi.uploadPhoto(userId, selectedFile);
      
      if (result.success) {
        toast.success(result.message || 'Photo uploaded successfully');
        setSelectedFile(null);
        setPreviewUrl(null);
        loadUsers(); // Reload users to get updated photo path
      } else {
        toast.error(result.message || 'Failed to upload photo');
      }
    } catch (error: any) {
      toast.error('Error uploading photo: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle photo delete
  const handlePhotoDelete = async (userId: number) => {
    setUploadingPhoto(true);
    try {
      const result = await userPhotoApi.deletePhoto(userId);
      
      if (result.success) {
        toast.success(result.message || 'Photo deleted successfully');
        loadUsers(); // Reload users to get updated photo path
      } else {
        toast.error(result.message || 'Failed to delete photo');
      }
    } catch (error: any) {
      toast.error('Error deleting photo: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Get user photo URL
  const getUserPhotoUrl = (user: User) => {
    return userPhotoApi.getPhotoUrl(user);
  };

  // Get role enum from string
  const getRoleEnum = (roleString: string): UserRole => {
    switch (roleString.toLowerCase()) {
      case 'admin': return UserRole.Admin;
      case 'developer': return UserRole.Developer;
      default: return UserRole.User;
    }
  };

  // Get role string from enum
  const getRoleString = (role: UserRole): string => {
    switch (role) {
      case UserRole.Admin: return 'admin';
      case UserRole.Developer: return 'developer';
      case UserRole.User: return 'user';
      default: return 'user';
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Users className="h-5 w-5" />
          <h1 className="text-lg font-semibold">User Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role.toString()}
                    onValueChange={(value) => setFormData({ ...formData, role: parseInt(value) as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.User.toString()}>User</SelectItem>
                      <SelectItem value={UserRole.Developer.toString()}>Developer</SelectItem>
                      <SelectItem value={UserRole.Admin.toString()}>Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={actionLoading}>
                  {actionLoading ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 m-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="p-2 bg-gray-100 rounded-lg">
            <Users className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
            <UserCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
            <UserX className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">Inactive users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Badge className="text-red-600 bg-red-100 text-xs">Admin</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-muted-foreground">Administrator users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Developers</CardTitle>
            <Badge className="text-blue-600 bg-blue-100 text-xs">Dev</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{developerUsers}</div>
            <p className="text-xs text-muted-foreground">Developer users</p>
          </CardContent>
        </Card>
      </div>

      {/* User List Table */}
      <Card className="m-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Users ({filteredData.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      Name <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort("email")}
                    >
                      Email <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort("role")}
                    >
                      Role <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <img
                              src={getUserPhotoUrl(user)}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/avatar-user.png';
                              }}
                            />
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phoneNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(getRoleString(user.role))}>
                            {getRoleDisplayName(getRoleString(user.role))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{user.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No users found matching your search." : "No users found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="edit-phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="edit-phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role.toString()}
                onValueChange={(value) => setFormData({ ...formData, role: parseInt(value) as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.User.toString()}>User</SelectItem>
                  <SelectItem value={UserRole.Developer.toString()}>Developer</SelectItem>
                  <SelectItem value={UserRole.Admin.toString()}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Photo Upload Section */}
            <div className="space-y-4">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : editingUser ? (
                    <img
                      src={getUserPhotoUrl(editingUser)}
                      alt={editingUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/avatar-user.png';
                      }}
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    {selectedFile && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => editingUser && handlePhotoUpload(editingUser.id)}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </div>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                    )}
                    {editingUser && editingUser.photoPath && editingUser.photoPath !== '/images/avatar-user.png' && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handlePhotoDelete(editingUser.id)}
                        disabled={uploadingPhoto}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload JPG, PNG, or GIF files under 5MB
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}