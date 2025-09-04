"use client";

import { useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Menu,
  Plus,
  Edit,
  Trash2,
  Save,
  Settings,
  Users,
  Shield,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Code,
} from "lucide-react";
import {
  useMenuManagement,
  useDynamicMenu,
  MenuGroupData,
  MenuItemData,
  MenuUserRole,
} from "@/hooks/useDynamicMenu";
import { getIconComponent } from "@/lib/icon-mapping";
import { IconSelector } from "@/components/icon-selector";
import {
  usePermissions,
  PermissionWrapper,
  CrudPermission,
} from "@/lib/role-permissions";
import { toast } from "sonner";

export default function MenuManagementPage() {
  const {
    roles,
    menuGroups,
    isLoading,
    error,
    createRole,
    updateRole,
    deleteRole,
    createMenuGroup,
    updateMenuGroup,
    deleteMenuGroup,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemActive,
    toggleMenuGroupActive,
    refreshData,
  } = useMenuManagement();

  const { refreshMenu } = useDynamicMenu();
  const permissions = usePermissions();

  // State for dialogs
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<MenuUserRole | null>(null);
  const [editingGroup, setEditingGroup] = useState<MenuGroupData | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);

  // State for pagination, search and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [sortField, setSortField] = useState<string>("menuGroup");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form states
  const [roleForm, setRoleForm] = useState({
    name: "",
    displayName: "",
    description: "",
    level: 1,
    color: "text-gray-600 bg-gray-100",
    isActive: true,
  });

  const [groupForm, setGroupForm] = useState({
    title: "",
    icon: "",
    sortOrder: 0,
    minRoleLevel: 1,
    isActive: true,
    requiresDeveloperMode: false,
  });

  const [itemForm, setItemForm] = useState({
    title: "",
    url: "",
    icon: "",
    sortOrder: 0,
    minRoleLevel: 1,
    isActive: true,
    requiresDeveloperMode: false,
    badgeText: "",
    badgeVariant: "default",
    menuGroupId: 0,
  });

  const handleCreateRole = async () => {
    try {
      await createRole(roleForm);
      setIsRoleDialogOpen(false);
      setRoleForm({
        name: "",
        displayName: "",
        description: "",
        level: 1,
        color: "text-gray-600 bg-gray-100",
        isActive: true,
      });
      toast.success("Role created successfully");
    } catch (error) {
      toast.error("Failed to create role");
    }
  };

  const handleCreateGroup = async () => {
    try {
      await createMenuGroup(groupForm);
      setIsGroupDialogOpen(false);
      setGroupForm({
        title: "",
        icon: "",
        sortOrder: 0,
        minRoleLevel: 1,
        isActive: true,
        requiresDeveloperMode: false,
      });
      toast.success("Menu group created successfully");
      refreshMenu(); // Refresh sidebar menu
    } catch (error) {
      toast.error("Failed to create menu group");
    }
  };

  const handleCreateItem = async () => {
    try {
      await createMenuItem({ ...itemForm });
      setIsItemDialogOpen(false);
      setItemForm({
        title: "",
        url: "",
        icon: "",
        sortOrder: 0,
        minRoleLevel: 1,
        isActive: true,
        requiresDeveloperMode: false,
        badgeText: "",
        badgeVariant: "default",
        menuGroupId: 0,
      });
      toast.success("Menu item created successfully");
      refreshMenu(); // Refresh sidebar menu
    } catch (error) {
      toast.error("Failed to create menu item");
    }
  };

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"item" | "group" | "role">(
    "item"
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const handleDeleteItem = async (id: number, name: string) => {
    setDeleteType("item");
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteType === "item") {
        await deleteMenuItem(deleteTarget.id);
        toast.success("Menu item deleted successfully");
        refreshMenu();
      } else if (deleteType === "group") {
        await deleteMenuGroup(deleteTarget.id);
        toast.success("Menu group deleted successfully");
        refreshMenu();
      } else if (deleteType === "role") {
        await deleteRole(deleteTarget.id);
        toast.success("Role deleted successfully");
      }
    } catch (error) {
      toast.error(`Failed to delete ${deleteType}`);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteGroup = async (id: number, name: string) => {
    setDeleteType("group");
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteRole = async (id: number, name: string) => {
    setDeleteType("role");
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleToggleItemActive = async (id: number) => {
    try {
      const result = await toggleMenuItemActive(id);
      toast.success(
        `Menu item ${
          result?.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      toast.error("Failed to toggle menu item status");
    }
  };

  const handleToggleGroupActive = async (id: number) => {
    try {
      const result = await toggleMenuGroupActive(id);
      toast.success(
        `Menu group ${
          result?.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      toast.error("Failed to toggle menu group status");
    }
  };

  const handleEditItem = (item: MenuItemData, group: MenuGroupData) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      url: item.url,
      icon: item.icon,
      sortOrder: item.sortOrder,
      minRoleLevel: item.minRoleLevel || 1,
      isActive: item.isActive,
      requiresDeveloperMode: item.requiresDeveloperMode,
      badgeText: item.badgeText || "",
      badgeVariant: item.badgeVariant || "default",
      menuGroupId: group.id,
    });
    setIsItemDialogOpen(true);
  };

  const handleEditGroup = (group: MenuGroupData) => {
    setEditingGroup(group);
    setGroupForm({
      title: group.title,
      icon: group.icon,
      sortOrder: group.sortOrder,
      minRoleLevel: group.minRoleLevel || 1,
      isActive: group.isActive,
      requiresDeveloperMode: group.requiresDeveloperMode,
    });
    setIsGroupDialogOpen(true);
  };

  const handleEditRole = (role: MenuUserRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      level: role.level,
      color: role.color,
      isActive: role.isActive,
    });
    setIsRoleDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      await updateMenuItem(editingItem.id, itemForm);
      setIsItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({
        title: "",
        url: "",
        icon: "",
        sortOrder: 0,
        minRoleLevel: 1,
        isActive: true,
        requiresDeveloperMode: false,
        badgeText: "",
        badgeVariant: "default",
        menuGroupId: 0,
      });
      toast.success("Menu item updated successfully");
    } catch (error) {
      toast.error("Failed to update menu item");
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      await updateMenuGroup(editingGroup.id, groupForm);
      setIsGroupDialogOpen(false);
      setEditingGroup(null);
      setGroupForm({
        title: "",
        icon: "",
        sortOrder: 0,
        minRoleLevel: 1,
        isActive: true,
        requiresDeveloperMode: false,
      });
      toast.success("Menu group updated successfully");
      refreshMenu(); // Refresh sidebar menu
    } catch (error) {
      toast.error("Failed to update menu group");
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      await updateRole(editingRole.id, roleForm);
      setIsRoleDialogOpen(false);
      setEditingRole(null);
      setRoleForm({
        name: "",
        displayName: "",
        description: "",
        level: 1,
        color: "text-gray-600 bg-gray-100",
        isActive: true,
      });
      toast.success("Role updated successfully");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const getRoleName = (level?: number) => {
    const role = roles.find((r) => r.level === level);
    return role?.displayName || "Unknown";
  };

  const getRoleColor = (level?: number) => {
    const role = roles.find((r) => r.level === level);
    return role?.color || "text-gray-600 bg-gray-100";
  };

  // Get all menu items with search and pagination
  const getAllMenuItems = () => {
    if (!menuGroups || !Array.isArray(menuGroups)) return [];

    return menuGroups.flatMap((group) =>
      group.items && Array.isArray(group.items)
        ? group.items.map((item) => ({
            ...item,
            groupTitle: group.title,
            groupId: group.id,
          }))
        : []
    );
  };

  const allMenuItems = getAllMenuItems();

  // Filter and sort items
  const filteredItems = allMenuItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.groupTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue, bValue;

    switch (sortField) {
      case "title":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case "url":
        aValue = a.url.toLowerCase();
        bValue = b.url.toLowerCase();
        break;
      case "group":
        aValue = a.groupTitle.toLowerCase();
        bValue = b.groupTitle.toLowerCase();
        break;
      case "role":
        aValue = a.minRoleLevel || 0;
        bValue = b.minRoleLevel || 0;
        break;
      case "order":
        aValue = a.sortOrder;
        bValue = b.sortOrder;
        break;
      case "active":
        aValue = a.isActive ? 1 : 0;
        bValue = b.isActive ? 1 : 0;
        break;
      default:
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
    }

    if (typeof aValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    } else {
      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  });

  // Calculate pagination
  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedItems.slice(startIndex, endIndex);

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Menu className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Menu Management</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="menu-groups" className="space-y-4">
          <TabsList>
            <PermissionWrapper condition={permissions.menu.tabs.menuGroups}>
              <TabsTrigger value="menu-groups">Menu Groups</TabsTrigger>
            </PermissionWrapper>
            <PermissionWrapper condition={permissions.menu.tabs.menuItems}>
              <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
            </PermissionWrapper>
            <PermissionWrapper condition={permissions.menu.tabs.roles}>
              <TabsTrigger value="roles">Roles</TabsTrigger>
            </PermissionWrapper>
            <PermissionWrapper condition={permissions.menu.tabs.preview}>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </PermissionWrapper>
          </TabsList>

          {/* Menu Groups Tab */}
          <PermissionWrapper condition={permissions.menu.tabs.menuGroups}>
            <TabsContent value="menu-groups" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Menu Groups</h2>
                <CrudPermission module="menuManagement" operation="create">
                  <Dialog
                    open={isGroupDialogOpen}
                    onOpenChange={setIsGroupDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingGroup
                            ? "Edit Menu Group"
                            : "Create Menu Group"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingGroup
                            ? "Update the menu group information."
                            : "Add a new menu group to organize navigation items."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="group-title" className="text-right">
                            Title
                          </Label>
                          <Input
                            id="group-title"
                            value={groupForm.title}
                            onChange={(e) =>
                              setGroupForm({
                                ...groupForm,
                                title: e.target.value,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <div className="col-span-3">
                            <IconSelector
                              value={groupForm.icon}
                              onChange={(iconName) =>
                                setGroupForm({ ...groupForm, icon: iconName })
                              }
                              placeholder="Select group icon..."
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="group-sort" className="text-right">
                            Sort Order
                          </Label>
                          <div className="col-span-3 flex gap-2">
                            <Input
                              id="group-sort"
                              type="number"
                              value={groupForm.sortOrder}
                              onChange={(e) =>
                                setGroupForm({
                                  ...groupForm,
                                  sortOrder: parseInt(e.target.value) || 0,
                                })
                              }
                              className="flex-1"
                            />
                            <div className="flex flex-col gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setGroupForm({
                                    ...groupForm,
                                    sortOrder: Math.max(
                                      0,
                                      groupForm.sortOrder - 1
                                    ),
                                  })
                                }
                                className="h-5 w-5 p-0"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setGroupForm({
                                    ...groupForm,
                                    sortOrder: groupForm.sortOrder + 1,
                                  })
                                }
                                className="h-5 w-5 p-0"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="group-role" className="text-right">
                            Min Role
                          </Label>
                          <Select
                            value={groupForm.minRoleLevel.toString()}
                            onValueChange={(value) =>
                              setGroupForm({
                                ...groupForm,
                                minRoleLevel: parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles && Array.isArray(roles)
                                ? roles.map((role) => (
                                    <SelectItem
                                      key={role.id}
                                      value={role.level.toString()}
                                    >
                                      {role.displayName} (Level {role.level})
                                    </SelectItem>
                                  ))
                                : null}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="group-active" className="text-right">
                            Active
                          </Label>
                          <Switch
                            id="group-active"
                            checked={groupForm.isActive}
                            onCheckedChange={(checked) =>
                              setGroupForm({ ...groupForm, isActive: checked })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="group-dev" className="text-right">
                            Developer Mode
                          </Label>
                          <Switch
                            id="group-dev"
                            checked={groupForm.requiresDeveloperMode}
                            onCheckedChange={(checked) =>
                              setGroupForm({
                                ...groupForm,
                                requiresDeveloperMode: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={
                            editingGroup ? handleUpdateGroup : handleCreateGroup
                          }
                        >
                          {editingGroup ? "Update Group" : "Create Group"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CrudPermission>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuGroups && Array.isArray(menuGroups)
                  ? menuGroups.map((group) => (
                      <Card key={group.id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{group.title}</span>
                              {group.requiresDeveloperMode && (
                                <Badge variant="secondary">Dev Mode</Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Switch
                                checked={group.isActive}
                                onCheckedChange={() =>
                                  handleToggleGroupActive(group.id)
                                }
                                className="mr-2"
                              />
                              <CrudPermission
                                module="menuManagement"
                                operation="update"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditGroup(group)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </CrudPermission>
                              <CrudPermission
                                module="menuManagement"
                                operation="delete"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteGroup(group.id, group.title)
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </CrudPermission>
                            </div>
                          </CardTitle>
                          <CardDescription>
                            <Badge className={getRoleColor(group.minRoleLevel)}>
                              {getRoleName(group.minRoleLevel)}+
                            </Badge>
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {group.items.length} items • Order:{" "}
                            {group.sortOrder}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : null}
              </div>
            </TabsContent>
          </PermissionWrapper>

          {/* Menu Items Tab */}
          <PermissionWrapper condition={permissions.menu.tabs.menuItems}>
            <TabsContent value="menu-items" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-semibold">Menu Items</h2>
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
                    {totalItems} items
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 w-full sm:w-64"
                    />
                  </div>
                  <CrudPermission module="menuManagement" operation="create">
                    <Dialog
                      open={isItemDialogOpen}
                      onOpenChange={setIsItemDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {editingItem
                              ? "Edit Menu Item"
                              : "Create Menu Item"}
                          </DialogTitle>
                          <DialogDescription>
                            {editingItem
                              ? "Update the menu item information."
                              : "Add a new menu item to a group."}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="item-title">Title</Label>
                              <Input
                                id="item-title"
                                value={itemForm.title}
                                onChange={(e) =>
                                  setItemForm({
                                    ...itemForm,
                                    title: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="item-url">URL</Label>
                              <Input
                                id="item-url"
                                value={itemForm.url}
                                onChange={(e) =>
                                  setItemForm({
                                    ...itemForm,
                                    url: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <IconSelector
                                value={itemForm.icon}
                                onChange={(iconName) =>
                                  setItemForm({ ...itemForm, icon: iconName })
                                }
                                placeholder="Select menu icon..."
                              />
                            </div>
                            <div>
                              <Label htmlFor="item-group">Group</Label>
                              <Select
                                value={itemForm.menuGroupId.toString()}
                                onValueChange={(value) =>
                                  setItemForm({
                                    ...itemForm,
                                    menuGroupId: parseInt(value),
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select group" />
                                </SelectTrigger>
                                <SelectContent>
                                  {menuGroups && Array.isArray(menuGroups)
                                    ? menuGroups.map((group) => (
                                        <SelectItem
                                          key={group.id}
                                          value={group.id.toString()}
                                        >
                                          {group.title}
                                        </SelectItem>
                                      ))
                                    : null}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="item-sort">Sort Order</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="item-sort"
                                  type="number"
                                  value={itemForm.sortOrder}
                                  onChange={(e) =>
                                    setItemForm({
                                      ...itemForm,
                                      sortOrder: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="flex-1"
                                />
                                <div className="flex flex-col gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setItemForm({
                                        ...itemForm,
                                        sortOrder: Math.max(
                                          0,
                                          itemForm.sortOrder - 1
                                        ),
                                      })
                                    }
                                    className="h-5 w-5 p-0"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setItemForm({
                                        ...itemForm,
                                        sortOrder: itemForm.sortOrder + 1,
                                      })
                                    }
                                    className="h-5 w-5 p-0"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="item-role">Min Role</Label>
                              <Select
                                value={itemForm.minRoleLevel.toString()}
                                onValueChange={(value) =>
                                  setItemForm({
                                    ...itemForm,
                                    minRoleLevel: parseInt(value),
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles && Array.isArray(roles)
                                    ? roles.map((role) => (
                                        <SelectItem
                                          key={role.id}
                                          value={role.level.toString()}
                                        >
                                          {role.displayName}
                                        </SelectItem>
                                      ))
                                    : null}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="item-active"
                                  checked={itemForm.isActive}
                                  onCheckedChange={(checked) =>
                                    setItemForm({
                                      ...itemForm,
                                      isActive: checked,
                                    })
                                  }
                                />
                                <Label htmlFor="item-active">Active</Label>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="item-dev"
                                checked={itemForm.requiresDeveloperMode}
                                onCheckedChange={(checked) =>
                                  setItemForm({
                                    ...itemForm,
                                    requiresDeveloperMode: checked,
                                  })
                                }
                              />
                              <Label htmlFor="item-dev">
                                Requires Developer Mode
                              </Label>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="item-badge">Badge Text</Label>
                              <Input
                                id="item-badge"
                                value={itemForm.badgeText}
                                onChange={(e) =>
                                  setItemForm({
                                    ...itemForm,
                                    badgeText: e.target.value,
                                  })
                                }
                                placeholder="Optional"
                              />
                            </div>
                            <div>
                              <Label htmlFor="item-badge-variant">
                                Badge Variant
                              </Label>
                              <Select
                                value={itemForm.badgeVariant}
                                onValueChange={(value) =>
                                  setItemForm({
                                    ...itemForm,
                                    badgeVariant: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">
                                    Default
                                  </SelectItem>
                                  <SelectItem value="secondary">
                                    Secondary
                                  </SelectItem>
                                  <SelectItem value="destructive">
                                    Destructive
                                  </SelectItem>
                                  <SelectItem value="outline">
                                    Outline
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={
                              editingItem ? handleUpdateItem : handleCreateItem
                            }
                          >
                            {editingItem ? "Update Item" : "Create Item"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CrudPermission>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Icon</TableHead>
                      <TableHead className="min-w-32">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort("title")}
                        >
                          Title
                          {getSortIcon("title")}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-32 hidden sm:table-cell">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort("url")}
                        >
                          URL
                          {getSortIcon("url")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-24">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort("group")}
                        >
                          Group
                          {getSortIcon("group")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-20">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort("role")}
                        >
                          Role
                          {getSortIcon("role")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-16 text-center">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort("order")}
                        >
                          Order
                          {getSortIcon("order")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-16 text-center">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort("active")}
                        >
                          Status
                          {getSortIcon("active")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-24 text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {searchQuery
                            ? "No menu items found matching your search."
                            : "No menu items available."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((item) => {
                        const ItemIcon = getIconComponent(item.icon);
                        const group = menuGroups.find(
                          (g) => g.id === item.groupId
                        );
                        return (
                          <TableRow
                            key={item.id}
                            className={
                              item.requiresDeveloperMode ? "bg-blue-50/50" : ""
                            }
                          >
                            <TableCell>
                              <div className="flex items-center justify-center">
                                <ItemIcon className="h-4 w-4 text-sidebar-foreground/60" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate max-w-32">
                                    {item.title}
                                  </span>
                                  {item.requiresDeveloperMode && (
                                    <div title="Developer Mode Required">
                                      <Code className="h-3 w-3 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                                {item.badgeText && (
                                  <Badge
                                    variant={item.badgeVariant as any}
                                    className="text-xs w-fit"
                                  >
                                    {item.badgeText}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground hidden sm:table-cell">
                              <span className="truncate max-w-32 block">
                                {item.url}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground truncate max-w-20 block">
                                {item.groupTitle}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-xs ${getRoleColor(
                                  item.minRoleLevel
                                )}`}
                              >
                                {getRoleName(item.minRoleLevel)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-mono text-muted-foreground">
                                {item.sortOrder}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Switch
                                  checked={item.isActive}
                                  onCheckedChange={() =>
                                    handleToggleItemActive(item.id)
                                  }
                                />
                                {!item.isActive && (
                                  <EyeOff className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-1">
                                <CrudPermission
                                  module="menuManagement"
                                  operation="update"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditItem(item, group!)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </CrudPermission>
                                <CrudPermission
                                  module="menuManagement"
                                  operation="delete"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteItem(item.id, item.title)
                                    }
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </CrudPermission>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    {/* Page numbers */}
                    <div className="flex gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          const page =
                            currentPage <= 3
                              ? i + 1
                              : currentPage >= totalPages - 2
                              ? totalPages - 4 + i
                              : currentPage - 2 + i;

                          if (page < 1 || page > totalPages) return null;

                          return (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </PermissionWrapper>

          {/* Roles Tab */}
          <PermissionWrapper condition={permissions.menu.tabs.roles}>
            <TabsContent value="roles" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Roles</h2>
                <CrudPermission module="menuManagement" operation="create">
                  <Dialog
                    open={isRoleDialogOpen}
                    onOpenChange={setIsRoleDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingRole ? "Edit Role" : "Create Role"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingRole
                            ? "Update the role information."
                            : "Add a new role with specific permissions."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role-name" className="text-right">
                            Name
                          </Label>
                          <Input
                            id="role-name"
                            value={roleForm.name}
                            onChange={(e) =>
                              setRoleForm({ ...roleForm, name: e.target.value })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role-display" className="text-right">
                            Display Name
                          </Label>
                          <Input
                            id="role-display"
                            value={roleForm.displayName}
                            onChange={(e) =>
                              setRoleForm({
                                ...roleForm,
                                displayName: e.target.value,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role-desc" className="text-right">
                            Description
                          </Label>
                          <Input
                            id="role-desc"
                            value={roleForm.description}
                            onChange={(e) =>
                              setRoleForm({
                                ...roleForm,
                                description: e.target.value,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role-level" className="text-right">
                            Level
                          </Label>
                          <Input
                            id="role-level"
                            type="number"
                            value={roleForm.level}
                            onChange={(e) =>
                              setRoleForm({
                                ...roleForm,
                                level: parseInt(e.target.value),
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={
                            editingRole ? handleUpdateRole : handleCreateRole
                          }
                        >
                          {editingRole ? "Update Role" : "Create Role"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CrudPermission>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles && Array.isArray(roles)
                  ? roles.map((role) => (
                      <Card key={role.id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={role.color}>
                                Level {role.level}
                              </Badge>
                              <span>{role.displayName}</span>
                            </div>
                            <div className="flex gap-1">
                              <CrudPermission
                                module="menuManagement"
                                operation="update"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRole(role)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </CrudPermission>
                              <CrudPermission
                                module="menuManagement"
                                operation="delete"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteRole(role.id, role.displayName)
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </CrudPermission>
                            </div>
                          </CardTitle>
                          <CardDescription>{role.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {role.permissions.length} permissions
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : null}
              </div>
            </TabsContent>
          </PermissionWrapper>

          {/* Preview Tab */}
          <PermissionWrapper condition={permissions.menu.tabs.preview}>
            <TabsContent value="preview" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Menu Preview</h2>
                <div className="text-sm text-muted-foreground">
                  Preview how the menu will look for different roles
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {roles && Array.isArray(roles)
                  ? roles.map((role) => (
                      <Card key={role.id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge className={role.color}>
                              {role.displayName}
                            </Badge>
                            <span>Menu View</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {menuGroups && Array.isArray(menuGroups)
                              ? menuGroups
                                  .filter(
                                    (group) =>
                                      !group.minRoleLevel ||
                                      group.minRoleLevel <= role.level
                                  )
                                  .map((group) => {
                                    const GroupIcon = getIconComponent(
                                      group.icon
                                    );
                                    return (
                                      <div
                                        key={group.id}
                                        className="border rounded-lg p-3"
                                      >
                                        <div className="font-medium text-sm flex items-center gap-2">
                                          <GroupIcon className="h-4 w-4 text-sidebar-foreground/60" />
                                          {group.title}
                                          {group.requiresDeveloperMode && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              Dev
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="ml-6 mt-2 space-y-1">
                                          {group.items &&
                                          Array.isArray(group.items)
                                            ? group.items
                                                .filter(
                                                  (item) =>
                                                    !item.minRoleLevel ||
                                                    item.minRoleLevel <=
                                                      role.level
                                                )
                                                .map((item) => {
                                                  const ItemIcon =
                                                    getIconComponent(item.icon);
                                                  return (
                                                    <div
                                                      key={item.id}
                                                      className="text-sm text-muted-foreground flex items-center gap-2"
                                                    >
                                                      <ItemIcon className="h-3 w-3 text-sidebar-foreground/60" />
                                                      • {item.title}
                                                      {item.requiresDeveloperMode && (
                                                        <Badge
                                                          variant="outline"
                                                          className="text-xs"
                                                        >
                                                          Dev
                                                        </Badge>
                                                      )}
                                                      {item.badgeText && (
                                                        <Badge
                                                          variant={
                                                            item.badgeVariant as any
                                                          }
                                                          className="text-xs"
                                                        >
                                                          {item.badgeText}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  );
                                                })
                                            : null}
                                        </div>
                                      </div>
                                    );
                                  })
                              : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : null}
              </div>
            </TabsContent>
          </PermissionWrapper>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete{" "}
                {deleteType === "item"
                  ? "Menu Item"
                  : deleteType === "group"
                  ? "Menu Group"
                  : "Role"}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.name}</strong>?
                {deleteType === "group" && (
                  <span className="block mt-2 text-amber-600">
                    ⚠️ This will only work if the group has no items.
                  </span>
                )}
                {deleteType === "role" && (
                  <span className="block mt-2 text-amber-600">
                    ⚠️ This will only work if no users are assigned to this
                    role.
                  </span>
                )}
                <span className="block mt-2 text-red-600 font-medium">
                  This action cannot be undone.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete{" "}
                {deleteType === "item"
                  ? "Item"
                  : deleteType === "group"
                  ? "Group"
                  : "Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarInset>
  );
}
