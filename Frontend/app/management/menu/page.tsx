"use client";

import { useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useMenuManagement, MenuGroupData, MenuItemData, UserRole } from "@/hooks/useDynamicMenu";
import { toast } from "sonner";

export default function MenuManagementPage() {
  const {
    roles,
    menuGroups,
    isLoading,
    error,
    createRole,
    createMenuGroup,
    createMenuItem,
    updateMenuGroup,
    updateMenuItem,
    deleteMenuItem,
    refreshData
  } = useMenuManagement();

  // State for dialogs
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [editingGroup, setEditingGroup] = useState<MenuGroupData | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);

  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    displayName: '',
    description: '',
    level: 1,
    color: 'text-gray-600 bg-gray-100',
    isActive: true
  });

  const [groupForm, setGroupForm] = useState({
    title: '',
    icon: '',
    sortOrder: 0,
    minRoleLevel: 1,
    isActive: true,
    requiresDeveloperMode: false
  });

  const [itemForm, setItemForm] = useState({
    title: '',
    url: '',
    icon: '',
    sortOrder: 0,
    minRoleLevel: 1,
    requiresDeveloperMode: false,
    badgeText: '',
    badgeVariant: 'default',
    menuGroupId: 0
  });

  const handleCreateRole = async () => {
    try {
      await createRole(roleForm);
      setIsRoleDialogOpen(false);
      setRoleForm({
        name: '',
        displayName: '',
        description: '',
        level: 1,
        color: 'text-gray-600 bg-gray-100',
        isActive: true
      });
      toast.success('Role created successfully');
    } catch (error) {
      toast.error('Failed to create role');
    }
  };

  const handleCreateGroup = async () => {
    try {
      await createMenuGroup(groupForm);
      setIsGroupDialogOpen(false);
      setGroupForm({
        title: '',
        icon: '',
        sortOrder: 0,
        minRoleLevel: 1,
        isActive: true,
        requiresDeveloperMode: false
      });
      toast.success('Menu group created successfully');
    } catch (error) {
      toast.error('Failed to create menu group');
    }
  };

  const handleCreateItem = async () => {
    try {
      await createMenuItem({ ...itemForm });
      setIsItemDialogOpen(false);
      setItemForm({
        title: '',
        url: '',
        icon: '',
        sortOrder: 0,
        minRoleLevel: 1,
        requiresDeveloperMode: false,
        badgeText: '',
        badgeVariant: 'default',
        menuGroupId: 0
      });
      toast.success('Menu item created successfully');
    } catch (error) {
      toast.error('Failed to create menu item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      try {
        await deleteMenuItem(id);
        toast.success('Menu item deleted successfully');
      } catch (error) {
        toast.error('Failed to delete menu item');
      }
    }
  };

  const getRoleName = (level?: number) => {
    const role = roles.find(r => r.level === level);
    return role?.displayName || 'Unknown';
  };

  const getRoleColor = (level?: number) => {
    const role = roles.find(r => r.level === level);
    return role?.color || 'text-gray-600 bg-gray-100';
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
            <TabsTrigger value="menu-groups">Menu Groups</TabsTrigger>
            <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Menu Groups Tab */}
          <TabsContent value="menu-groups" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Menu Groups</h2>
              <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Menu Group</DialogTitle>
                    <DialogDescription>
                      Add a new menu group to organize navigation items.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="group-title" className="text-right">Title</Label>
                      <Input
                        id="group-title"
                        value={groupForm.title}
                        onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="group-icon" className="text-right">Icon</Label>
                      <Input
                        id="group-icon"
                        value={groupForm.icon}
                        onChange={(e) => setGroupForm({ ...groupForm, icon: e.target.value })}
                        placeholder="lucide-react icon name"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="group-sort" className="text-right">Sort Order</Label>
                      <Input
                        id="group-sort"
                        type="number"
                        value={groupForm.sortOrder}
                        onChange={(e) => setGroupForm({ ...groupForm, sortOrder: parseInt(e.target.value) })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="group-role" className="text-right">Min Role</Label>
                      <Select value={groupForm.minRoleLevel.toString()} onValueChange={(value) => setGroupForm({ ...groupForm, minRoleLevel: parseInt(value) })}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.level.toString()}>
                              {role.displayName} (Level {role.level})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="group-dev" className="text-right">Developer Mode</Label>
                      <Switch
                        id="group-dev"
                        checked={groupForm.requiresDeveloperMode}
                        onCheckedChange={(checked) => setGroupForm({ ...groupForm, requiresDeveloperMode: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateGroup}>Create Group</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuGroups.map((group) => (
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
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
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
                      {group.items.length} items • Order: {group.sortOrder}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Menu Items Tab */}
          <TabsContent value="menu-items" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Menu Items</h2>
              <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Menu Item</DialogTitle>
                    <DialogDescription>
                      Add a new menu item to a group.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item-title">Title</Label>
                        <Input
                          id="item-title"
                          value={itemForm.title}
                          onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-url">URL</Label>
                        <Input
                          id="item-url"
                          value={itemForm.url}
                          onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item-icon">Icon</Label>
                        <Input
                          id="item-icon"
                          value={itemForm.icon}
                          onChange={(e) => setItemForm({ ...itemForm, icon: e.target.value })}
                          placeholder="lucide-react icon name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-group">Group</Label>
                        <Select value={itemForm.menuGroupId.toString()} onValueChange={(value) => setItemForm({ ...itemForm, menuGroupId: parseInt(value) })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                          <SelectContent>
                            {menuGroups.map((group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="item-sort">Sort Order</Label>
                        <Input
                          id="item-sort"
                          type="number"
                          value={itemForm.sortOrder}
                          onChange={(e) => setItemForm({ ...itemForm, sortOrder: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-role">Min Role</Label>
                        <Select value={itemForm.minRoleLevel.toString()} onValueChange={(value) => setItemForm({ ...itemForm, minRoleLevel: parseInt(value) })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.level.toString()}>
                                {role.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="item-dev"
                            checked={itemForm.requiresDeveloperMode}
                            onCheckedChange={(checked) => setItemForm({ ...itemForm, requiresDeveloperMode: checked })}
                          />
                          <Label htmlFor="item-dev">Dev Mode</Label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item-badge">Badge Text</Label>
                        <Input
                          id="item-badge"
                          value={itemForm.badgeText}
                          onChange={(e) => setItemForm({ ...itemForm, badgeText: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-badge-variant">Badge Variant</Label>
                        <Select value={itemForm.badgeVariant} onValueChange={(value) => setItemForm({ ...itemForm, badgeVariant: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="destructive">Destructive</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateItem}>Create Item</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuGroups.flatMap(group => 
                  group.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.title}
                          {item.badgeText && (
                            <Badge variant={item.badgeVariant as any}>{item.badgeText}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.url}</TableCell>
                      <TableCell>{group.title}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(item.minRoleLevel)}>
                          {getRoleName(item.minRoleLevel)}+
                        </Badge>
                      </TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.requiresDeveloperMode && (
                            <Badge variant="secondary">Dev</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Roles</h2>
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Role</DialogTitle>
                    <DialogDescription>
                      Add a new role with specific permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role-name" className="text-right">Name</Label>
                      <Input
                        id="role-name"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role-display" className="text-right">Display Name</Label>
                      <Input
                        id="role-display"
                        value={roleForm.displayName}
                        onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role-desc" className="text-right">Description</Label>
                      <Input
                        id="role-desc"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role-level" className="text-right">Level</Label>
                      <Input
                        id="role-level"
                        type="number"
                        value={roleForm.level}
                        onChange={(e) => setRoleForm({ ...roleForm, level: parseInt(e.target.value) })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateRole}>Create Role</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <Card key={role.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={role.color}>
                          Level {role.level}
                        </Badge>
                        <span>{role.displayName}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {role.permissions.length} permissions
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Menu Preview</h2>
              <div className="text-sm text-muted-foreground">
                Preview how the menu will look for different roles
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {roles.map((role) => (
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
                      {menuGroups
                        .filter(group => !group.minRoleLevel || group.minRoleLevel <= role.level)
                        .map(group => (
                          <div key={group.id} className="border rounded-lg p-3">
                            <div className="font-medium text-sm flex items-center gap-2">
                              {group.title}
                              {group.requiresDeveloperMode && (
                                <Badge variant="outline" className="text-xs">Dev</Badge>
                              )}
                            </div>
                            <div className="ml-4 mt-2 space-y-1">
                              {group.items
                                .filter(item => !item.minRoleLevel || item.minRoleLevel <= role.level)
                                .map(item => (
                                  <div key={item.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                    • {item.title}
                                    {item.requiresDeveloperMode && (
                                      <Badge variant="outline" className="text-xs">Dev</Badge>
                                    )}
                                    {item.badgeText && (
                                      <Badge variant={item.badgeVariant as any} className="text-xs">
                                        {item.badgeText}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}