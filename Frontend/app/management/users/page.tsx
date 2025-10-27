"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  UserCheck,
  UserX,
  Search,
  Upload,
  Camera,
  X,
  Eye,
  EyeOff,
  Check,
  X as XIcon,
  Lock,
} from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  usersApi,
  userPhotoApi,
  mqttApi,
  User,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/lib/api-service";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { getRoleDisplayName, getRoleColor } from "@/lib/auth-utils";
import { toast } from "sonner";
import ThemeAvatar from "@/components/theme-avatar";
import { getAppConfig } from "@/lib/config";
import { isDefaultAvatar } from "@/lib/avatar-utils";
import {
  usePermissions,
  PermissionWrapper,
  CrudPermission,
} from "@/lib/role-permissions";

const ITEMS_PER_PAGE = 10;

export default function UserManagementPage() {
  const permissions = usePermissions();
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

  // Form state - use a flexible type that can handle both create and edit
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password?: string;
    phoneNumber?: string;
    role: UserRole;
  }>({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: UserRole.User,
  });

  // Password validation state
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
  });

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } =
    useSortableTable(users);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    sorted,
    ["name", "email", "phoneNumber"]
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminUsers = users.filter(
    (user) => user.role === UserRole.Admin
  ).length;
  const developerUsers = users.filter(
    (user) => user.role === UserRole.Developer
  ).length;
  const regularUsers = users.filter(
    (user) => user.role === UserRole.User
  ).length;

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

  // Password validation function
  const validatePassword = (password: string, confirmPassword: string) => {
    const validation = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: password === confirmPassword && password.length > 0,
    };
    setPasswordValidation(validation);
    return Object.values(validation).every(Boolean);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phoneNumber: "",
      role: UserRole.User,
    });
    setPasswordConfirm("");
    setPasswordValidation({
      minLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumber: false,
      hasSpecialChar: false,
      passwordsMatch: false,
    });
    setEditingUser(null);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Handle create user
  const handleCreateUser = async () => {
    // Validate form fields
    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!formData.password?.trim()) {
      toast.error("Password is required");
      return;
    }

    // Validate password strength and confirmation
    const isPasswordValid = validatePassword(formData.password || "", passwordConfirm);
    if (!isPasswordValid) {
      toast.error("Please ensure password meets all requirements and passwords match");
      return;
    }

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
      const result = await usersApi.updateUser(
        editingUser.id,
        formData as UpdateUserRequest
      );
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
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Invalid file type. Please upload JPG, PNG, or GIF files only."
        );
        return;
      }

      if (file.size > maxSize) {
        toast.error("File size too large. Please upload files under 5MB.");
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
        toast.success(result.message || "Photo uploaded successfully");

        // Update editingUser state to reflect new photo
        if (
          editingUser &&
          editingUser.id === userId &&
          result.data?.photoPath
        ) {
          setEditingUser({
            ...editingUser,
            photoPath: result.data.photoPath,
          });
        }

        setSelectedFile(null);
        setPreviewUrl(null);
        loadUsers(); // Reload users to get updated photo path
      } else {
        toast.error(result.message || "Failed to upload photo");
      }
    } catch (error: any) {
      toast.error("Error uploading photo: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle photo delete
  const handlePhotoDelete = async (userId: number) => {
    setUploadingPhoto(true);
    try {
      const result = await userPhotoApi.deletePhoto(userId);
[{
	"resource": "/home/ubuntu/Alfi/RnD/Development/NewContainment/Frontend/app/management/users/page.tsx",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type 'null' is not assignable to type 'string | undefined'.",
	"source": "ts",
	"startLineNumber": 406,
	"startColumn": 13,
	"endLineNumber": 406,
	"endColumn": 22,
	"origin": "extHost1"
}]
      if (result.success) {
        toast.success(result.message || "Photo deleted successfully");

        // Update editingUser state to reflect photo removal
        if (editingUser && editingUser.id === userId) {
          setEditingUser({
            ...editingUser,
            photoPath: undefined,
          });
        }

        loadUsers(); // Reload users to get updated photo path
      } else {
        toast.error(result.message || "Failed to delete photo");
      }
    } catch (error: any) {
      toast.error("Error deleting photo: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const { apiBaseUrl } = getAppConfig();

  // Get role enum from string
  const getRoleEnum = (roleString: string): UserRole => {
    switch (roleString.toLowerCase()) {
      case "admin":
        return UserRole.Admin;
      case "developer":
        return UserRole.Developer;
      default:
        return UserRole.User;
    }
  };

  // Get role string from enum
  const getRoleString = (role: UserRole): string => {
    switch (role) {
      case UserRole.Admin:
        return "admin";
      case UserRole.Developer:
        return "developer";
      case UserRole.User:
        return "user";
      default:
        return "user";
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
          <CrudPermission module="userManagement" operation="create">
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
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phoneNumber: e.target.value,
                        })
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          validatePassword(e.target.value || "", passwordConfirm);
                        }}
                        placeholder="Enter password"
                      />
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="passwordConfirm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="passwordConfirm"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => {
                          setPasswordConfirm(e.target.value);
                          validatePassword(formData.password || "", e.target.value);
                        }}
                        placeholder="Confirm password"
                      />
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <Label>Password Requirements</Label>
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.minLength ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <XIcon className="h-3 w-3 text-red-600" />
                        )}
                        <span className={passwordValidation.minLength ? "text-green-600" : "text-red-600"}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.hasUpperCase ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <XIcon className="h-3 w-3 text-red-600" />
                        )}
                        <span className={passwordValidation.hasUpperCase ? "text-green-600" : "text-red-600"}>
                          One uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.hasLowerCase ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <XIcon className="h-3 w-3 text-red-600" />
                        )}
                        <span className={passwordValidation.hasLowerCase ? "text-green-600" : "text-red-600"}>
                          One lowercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.hasNumber ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <XIcon className="h-3 w-3 text-red-600" />
                        )}
                        <span className={passwordValidation.hasNumber ? "text-green-600" : "text-red-600"}>
                          One number
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.hasSpecialChar ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <XIcon className="h-3 w-3 text-red-600" />
                        )}
                        <span className={passwordValidation.hasSpecialChar ? "text-green-600" : "text-red-600"}>
                          One special character
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordValidation.passwordsMatch ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <XIcon className="h-3 w-3 text-red-600" />
                        )}
                        <span className={passwordValidation.passwordsMatch ? "text-green-600" : "text-red-600"}>
                          Passwords match
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role.toString()}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          role: parseInt(value) as UserRole,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.User.toString()}>
                          User
                        </SelectItem>
                        <SelectItem value={UserRole.Developer.toString()}>
                          Developer
                        </SelectItem>
                        <SelectItem value={UserRole.Admin.toString()}>
                          Admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CrudPermission>
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
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
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
            <div className="text-2xl font-bold text-green-600">
              {activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Users
            </CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <UserX className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inactiveUsers}
            </div>
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
                      onClick={() => handleSort("role")}
                    >
                      Role <ArrowUpDown className="inline ml-1 h-4 w-4" />
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <PermissionWrapper
                      condition={
                        permissions.user.canUpdate || permissions.user.canDelete
                      }
                    >
                      <TableHead className="text-right">Actions</TableHead>
                    </PermissionWrapper>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <ThemeAvatar
                              user={user}
                              baseUrl={apiBaseUrl}
                              className="object-cover border"
                              alt={user.name}
                              width={32}
                              height={32}
                            />
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-sm text-muted-foreground mt-0.5">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getRoleColor(getRoleString(user.role))}
                          >
                            {getRoleDisplayName(getRoleString(user.role))}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.phoneNumber || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "success" : "danger"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <PermissionWrapper
                          condition={
                            permissions.user.canUpdate ||
                            permissions.user.canDelete
                          }
                        >
                          <TableCell className="text-right space-x-2">
                            <CrudPermission
                              module="userManagement"
                              operation="update"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </CrudPermission>
                            <CrudPermission
                              module="userManagement"
                              operation="delete"
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-red-600 bg-red-100 hover:bg-red-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {user.name}
                                      "? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </CrudPermission>
                          </TableCell>
                        </PermissionWrapper>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={
                          permissions.user.canUpdate ||
                          permissions.user.canDelete
                            ? 7
                            : 6
                        }
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery
                          ? "No users found matching your search."
                          : "No users found."}
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
                          onClick={() =>
                            setCurrentPage((p) => Math.max(p - 1, 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
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
                          onClick={() =>
                            setCurrentPage((p) => Math.min(p + 1, totalPages))
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
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
            <DialogTitle>
              Edit User:{" "}
              <span className="text-muted-foreground">
                [ {editingUser?.name} ]
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                    <ThemeAvatar
                      user={editingUser}
                      baseUrl={apiBaseUrl}
                      className="object-cover"
                      alt={editingUser.name}
                      width={128}
                      height={128}
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
                      onClick={() =>
                        document.getElementById("photo-upload")?.click()
                      }
                      disabled={uploadingPhoto}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    {selectedFile && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          editingUser && handlePhotoUpload(editingUser.id)
                        }
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
                    {editingUser &&
                      editingUser.photoPath &&
                      !isDefaultAvatar(editingUser.photoPath) && (
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
                      Selected: {selectedFile.name} (
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload JPG, PNG, or GIF files under 5MB
                  </p>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="edit-phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="edit-phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role.toString()}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    role: parseInt(value) as UserRole,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.User.toString()}>User</SelectItem>
                  <SelectItem value={UserRole.Developer.toString()}>
                    Developer
                  </SelectItem>
                  <SelectItem value={UserRole.Admin.toString()}>
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
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
