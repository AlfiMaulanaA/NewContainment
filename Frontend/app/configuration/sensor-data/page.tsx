"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Thermometer, 
  Clock, 
  Palette, 
  Bell, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

interface SensorConfiguration {
  id: number
  name: string
  description?: string
  saveIntervalSeconds: number
  isIntervalEnabled: boolean
  isTemperatureThresholdEnabled: boolean
  temperatureUpperThreshold?: number
  temperatureLowerThreshold?: number
  temperatureColdColor: string
  temperatureNormalColor: string
  temperatureWarmColor: string
  temperatureHotColor: string
  temperatureCriticalColor: string
  temperatureColdMax: number
  temperatureNormalMin: number
  temperatureNormalMax: number
  temperatureWarmMin: number
  temperatureWarmMax: number
  temperatureHotMin: number
  temperatureHotMax: number
  temperatureCriticalMin: number
  autoSaveOnThresholdExceed: boolean
  autoSaveOnUpperThreshold: boolean
  autoSaveOnLowerThreshold: boolean
  enableNotifications: boolean
  notificationRecipients?: string
  deviceId?: number
  containmentId?: number
  isGlobalConfiguration: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Device {
  id: number
  name: string
  type: string
  sensorType?: string
}

interface Containment {
  id: number
  name: string
}

export default function SensorDataConfigurationPage() {
  const [configurations, setConfigurations] = useState<SensorConfiguration[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [containments, setContainments] = useState<Containment[]>([])
  const [selectedConfig, setSelectedConfig] = useState<SensorConfiguration | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<Partial<SensorConfiguration>>({
    name: '',
    description: '',
    saveIntervalSeconds: 300,
    isIntervalEnabled: true,
    isTemperatureThresholdEnabled: false,
    temperatureUpperThreshold: 35,
    temperatureLowerThreshold: 10,
    temperatureColdColor: '#3B82F6',
    temperatureNormalColor: '#10B981',
    temperatureWarmColor: '#F59E0B',
    temperatureHotColor: '#EF4444',
    temperatureCriticalColor: '#7C2D12',
    temperatureColdMax: 15.0,
    temperatureNormalMin: 15.1,
    temperatureNormalMax: 25.0,
    temperatureWarmMin: 25.1,
    temperatureWarmMax: 30.0,
    temperatureHotMin: 30.1,
    temperatureHotMax: 35.0,
    temperatureCriticalMin: 35.1,
    autoSaveOnThresholdExceed: false,
    autoSaveOnUpperThreshold: true,
    autoSaveOnLowerThreshold: false,
    enableNotifications: false,
    isGlobalConfiguration: false
  })

  useEffect(() => {
    fetchConfigurations()
    fetchDevices()
    fetchContainments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConfigurations = async () => {
    try {
      const response = await fetch('/api/sensor-data-configuration')
      if (response.ok) {
        const data = await response.json()
        setConfigurations(data)
        if (data.length > 0 && !selectedConfig) {
          setSelectedConfig(data[0])
        }
      }
    } catch (error) {
      // console.error('Error fetching configurations:', error)
      toast.error('Failed to load configurations')
    } finally {
      setLoading(false)
    }
  }

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices')
      if (response.ok) {
        const data = await response.json()
        setDevices(data)
      }
    } catch (error) {
      // console.error('Error fetching devices:', error)
    }
  }

  const fetchContainments = async () => {
    try {
      const response = await fetch('/api/containments')
      if (response.ok) {
        const data = await response.json()
        setContainments(data)
      }
    } catch (error) {
      // console.error('Error fetching containments:', error)
    }
  }

  const handleSaveConfiguration = async () => {
    if (!formData.name?.trim()) {
      toast.error('Configuration name is required')
      return
    }

    setSaving(true)
    try {
      const url = isCreating 
        ? '/api/sensor-data-configuration' 
        : `/api/sensor-data-configuration/${selectedConfig?.id}`
      
      const method = isCreating ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(`Configuration ${isCreating ? 'created' : 'updated'} successfully`)
        await fetchConfigurations()
        setIsEditing(false)
        setIsCreating(false)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save configuration')
      }
    } catch (error) {
      // console.error('Error saving configuration:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfiguration = async (configId: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return

    try {
      const response = await fetch(`/api/sensor-data-configuration/${configId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Configuration deleted successfully')
        await fetchConfigurations()
        if (selectedConfig?.id === configId) {
          setSelectedConfig(configurations[0] || null)
        }
      } else {
        toast.error('Failed to delete configuration')
      }
    } catch (error) {
      // console.error('Error deleting configuration:', error)
      toast.error('Failed to delete configuration')
    }
  }

  const startEditing = (config: SensorConfiguration) => {
    setSelectedConfig(config)
    setFormData(config)
    setIsEditing(true)
    setIsCreating(false)
  }

  const startCreating = () => {
    setFormData({
      name: '',
      description: '',
      saveIntervalSeconds: 300,
      isIntervalEnabled: true,
      isTemperatureThresholdEnabled: false,
      temperatureUpperThreshold: 35,
      temperatureLowerThreshold: 10,
      temperatureColdColor: '#3B82F6',
      temperatureNormalColor: '#10B981',
      temperatureWarmColor: '#F59E0B',
      temperatureHotColor: '#EF4444',
      temperatureCriticalColor: '#7C2D12',
      temperatureColdMax: 15.0,
      temperatureNormalMin: 15.1,
      temperatureNormalMax: 25.0,
      temperatureWarmMin: 25.1,
      temperatureWarmMax: 30.0,
      temperatureHotMin: 30.1,
      temperatureHotMax: 35.0,
      temperatureCriticalMin: 35.1,
      autoSaveOnThresholdExceed: false,
      autoSaveOnUpperThreshold: true,
      autoSaveOnLowerThreshold: false,
      enableNotifications: false,
      isGlobalConfiguration: false
    })
    setIsCreating(true)
    setIsEditing(true)
  }

  const getIntervalDisplay = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  const getConfigurationType = (config: SensorConfiguration) => {
    if (config.isGlobalConfiguration) return 'Global'
    if (config.deviceId) return 'Device'
    if (config.containmentId) return 'Containment'
    return 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading configurations...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sensor Data Configuration</h1>
          <p className="text-muted-foreground">
            Configure save intervals, temperature thresholds, and color ranges for sensor data
          </p>
        </div>
        <Button onClick={startCreating} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configurations</CardTitle>
            <CardDescription>Manage sensor data configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedConfig?.id === config.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedConfig(config)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{config.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getConfigurationType(config)} • {getIntervalDisplay(config.saveIntervalSeconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {config.isIntervalEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Interval
                        </Badge>
                      )}
                      {config.isTemperatureThresholdEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          <Thermometer className="h-3 w-3 mr-1" />
                          Threshold
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {isCreating ? 'Create Configuration' : isEditing ? 'Edit Configuration' : 'Configuration Details'}
                </CardTitle>
                <CardDescription>
                  {isCreating 
                    ? 'Create a new sensor data configuration' 
                    : isEditing 
                      ? 'Edit the selected configuration'
                      : selectedConfig?.description || 'View configuration details'
                  }
                </CardDescription>
              </div>
              {selectedConfig && !isEditing && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEditing(selectedConfig)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteConfiguration(selectedConfig.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedConfig || isCreating ? (
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="interval">Interval</TabsTrigger>
                  <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                  <TabsTrigger value="colors">Colors</TabsTrigger>
                  <TabsTrigger value="notifications">Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Configuration Name</Label>
                      <Input
                        id="name"
                        value={isEditing ? formData.name || '' : selectedConfig?.name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Enter configuration name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Configuration Type</Label>
                      <Select
                        value={
                          isEditing 
                            ? formData.isGlobalConfiguration 
                              ? 'global' 
                              : formData.deviceId 
                                ? 'device' 
                                : formData.containmentId 
                                  ? 'containment' 
                                  : 'global'
                            : getConfigurationType(selectedConfig!).toLowerCase()
                        }
                        onValueChange={(value) => {
                          if (isEditing) {
                            setFormData(prev => ({
                              ...prev,
                              isGlobalConfiguration: value === 'global',
                              deviceId: value === 'device' ? prev.deviceId : undefined,
                              containmentId: value === 'containment' ? prev.containmentId : undefined
                            }))
                          }
                        }}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global</SelectItem>
                          <SelectItem value="device">Device Specific</SelectItem>
                          <SelectItem value="containment">Containment Specific</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={isEditing ? formData.description || '' : selectedConfig?.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter description (optional)"
                    />
                  </div>

                  {isEditing && !formData.isGlobalConfiguration && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.deviceId !== undefined && (
                        <div>
                          <Label htmlFor="device">Device</Label>
                          <Select
                            value={formData.deviceId?.toString() || ''}
                            onValueChange={(value) => setFormData(prev => ({ 
                              ...prev, 
                              deviceId: value ? parseInt(value) : undefined 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select device" />
                            </SelectTrigger>
                            <SelectContent>
                              {devices.map(device => (
                                <SelectItem key={device.id} value={device.id.toString()}>
                                  {device.name} ({device.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.containmentId !== undefined && (
                        <div>
                          <Label htmlFor="containment">Containment</Label>
                          <Select
                            value={formData.containmentId?.toString() || ''}
                            onValueChange={(value) => setFormData(prev => ({ 
                              ...prev, 
                              containmentId: value ? parseInt(value) : undefined 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select containment" />
                            </SelectTrigger>
                            <SelectContent>
                              {containments.map(containment => (
                                <SelectItem key={containment.id} value={containment.id.toString()}>
                                  {containment.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="interval" className="space-y-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Configure how often sensor data should be automatically saved to the database.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isEditing ? formData.isIntervalEnabled : selectedConfig?.isIntervalEnabled}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          setFormData(prev => ({ ...prev, isIntervalEnabled: checked }))
                        }
                      }}
                      disabled={!isEditing}
                    />
                    <Label>Enable interval-based saving</Label>
                  </div>

                  {(isEditing ? formData.isIntervalEnabled : selectedConfig?.isIntervalEnabled) && (
                    <div>
                      <Label htmlFor="interval">Save Interval (seconds)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="interval"
                          type="number"
                          min="1"
                          value={isEditing ? formData.saveIntervalSeconds : selectedConfig?.saveIntervalSeconds}
                          onChange={(e) => {
                            if (isEditing) {
                              setFormData(prev => ({ ...prev, saveIntervalSeconds: parseInt(e.target.value) || 300 }))
                            }
                          }}
                          disabled={!isEditing}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">
                          ({getIntervalDisplay(isEditing ? formData.saveIntervalSeconds || 300 : selectedConfig?.saveIntervalSeconds || 300)})
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sensor data will be saved every {getIntervalDisplay(isEditing ? formData.saveIntervalSeconds || 300 : selectedConfig?.saveIntervalSeconds || 300)}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="thresholds" className="space-y-4">
                  <Alert>
                    <Thermometer className="h-4 w-4" />
                    <AlertDescription>
                      Set temperature thresholds to trigger automatic data saving when exceeded.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isEditing ? formData.isTemperatureThresholdEnabled : selectedConfig?.isTemperatureThresholdEnabled}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          setFormData(prev => ({ ...prev, isTemperatureThresholdEnabled: checked }))
                        }
                      }}
                      disabled={!isEditing}
                    />
                    <Label>Enable temperature thresholds</Label>
                  </div>

                  {(isEditing ? formData.isTemperatureThresholdEnabled : selectedConfig?.isTemperatureThresholdEnabled) && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="upperThreshold">Upper Threshold (°C)</Label>
                          <Input
                            id="upperThreshold"
                            type="number"
                            step="0.1"
                            value={isEditing ? formData.temperatureUpperThreshold : selectedConfig?.temperatureUpperThreshold}
                            onChange={(e) => {
                              if (isEditing) {
                                setFormData(prev => ({ ...prev, temperatureUpperThreshold: parseFloat(e.target.value) || undefined }))
                              }
                            }}
                            disabled={!isEditing}
                            placeholder="e.g., 35.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lowerThreshold">Lower Threshold (°C)</Label>
                          <Input
                            id="lowerThreshold"
                            type="number"
                            step="0.1"
                            value={isEditing ? formData.temperatureLowerThreshold : selectedConfig?.temperatureLowerThreshold}
                            onChange={(e) => {
                              if (isEditing) {
                                setFormData(prev => ({ ...prev, temperatureLowerThreshold: parseFloat(e.target.value) || undefined }))
                              }
                            }}
                            disabled={!isEditing}
                            placeholder="e.g., 10.0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={isEditing ? formData.autoSaveOnThresholdExceed : selectedConfig?.autoSaveOnThresholdExceed}
                            onCheckedChange={(checked) => {
                              if (isEditing) {
                                setFormData(prev => ({ ...prev, autoSaveOnThresholdExceed: checked }))
                              }
                            }}
                            disabled={!isEditing}
                          />
                          <Label>Auto-save when thresholds are exceeded</Label>
                        </div>

                        {(isEditing ? formData.autoSaveOnThresholdExceed : selectedConfig?.autoSaveOnThresholdExceed) && (
                          <div className="ml-6 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={isEditing ? formData.autoSaveOnUpperThreshold : selectedConfig?.autoSaveOnUpperThreshold}
                                onCheckedChange={(checked) => {
                                  if (isEditing) {
                                    setFormData(prev => ({ ...prev, autoSaveOnUpperThreshold: checked }))
                                  }
                                }}
                                disabled={!isEditing}
                              />
                              <Label className="text-sm">Save when upper threshold exceeded</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={isEditing ? formData.autoSaveOnLowerThreshold : selectedConfig?.autoSaveOnLowerThreshold}
                                onCheckedChange={(checked) => {
                                  if (isEditing) {
                                    setFormData(prev => ({ ...prev, autoSaveOnLowerThreshold: checked }))
                                  }
                                }}
                                disabled={!isEditing}
                              />
                              <Label className="text-sm">Save when lower threshold exceeded</Label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="colors" className="space-y-4">
                  <Alert>
                    <Palette className="h-4 w-4" />
                    <AlertDescription>
                      Configure color ranges for temperature visualization in the frontend.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: 'temperatureColdColor', label: 'Cold', range: `≤ ${isEditing ? formData.temperatureColdMax : selectedConfig?.temperatureColdMax}°C` },
                        { key: 'temperatureNormalColor', label: 'Normal', range: `${isEditing ? formData.temperatureNormalMin : selectedConfig?.temperatureNormalMin}-${isEditing ? formData.temperatureNormalMax : selectedConfig?.temperatureNormalMax}°C` },
                        { key: 'temperatureWarmColor', label: 'Warm', range: `${isEditing ? formData.temperatureWarmMin : selectedConfig?.temperatureWarmMin}-${isEditing ? formData.temperatureWarmMax : selectedConfig?.temperatureWarmMax}°C` },
                        { key: 'temperatureHotColor', label: 'Hot', range: `${isEditing ? formData.temperatureHotMin : selectedConfig?.temperatureHotMin}-${isEditing ? formData.temperatureHotMax : selectedConfig?.temperatureHotMax}°C` },
                        { key: 'temperatureCriticalColor', label: 'Critical', range: `≥ ${isEditing ? formData.temperatureCriticalMin : selectedConfig?.temperatureCriticalMin}°C` }
                      ].map(({ key, label, range }) => (
                        <div key={key} className="space-y-2">
                          <Label>{label} ({range})</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={isEditing ? (formData as any)[key] : (selectedConfig as any)?.[key]}
                              onChange={(e) => {
                                if (isEditing) {
                                  setFormData(prev => ({ ...prev, [key]: e.target.value }))
                                }
                              }}
                              disabled={!isEditing}
                              className="w-16 h-10 p-1"
                            />
                            <div 
                              className="w-10 h-10 rounded border"
                              style={{ backgroundColor: isEditing ? (formData as any)[key] : (selectedConfig as any)?.[key] }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertDescription>
                      Configure notifications for threshold violations and system alerts.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isEditing ? formData.enableNotifications : selectedConfig?.enableNotifications}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          setFormData(prev => ({ ...prev, enableNotifications: checked }))
                        }
                      }}
                      disabled={!isEditing}
                    />
                    <Label>Enable notifications</Label>
                  </div>

                  {(isEditing ? formData.enableNotifications : selectedConfig?.enableNotifications) && (
                    <div>
                      <Label htmlFor="recipients">Notification Recipients</Label>
                      <Input
                        id="recipients"
                        value={isEditing ? formData.notificationRecipients || '' : selectedConfig?.notificationRecipients || ''}
                        onChange={(e) => {
                          if (isEditing) {
                            setFormData(prev => ({ ...prev, notificationRecipients: e.target.value }))
                          }
                        }}
                        disabled={!isEditing}
                        placeholder="email1@example.com, email2@example.com"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter email addresses separated by commas
                      </p>
                    </div>
                  )}
                </TabsContent>

                {isEditing && (
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false)
                        setIsCreating(false)
                        setFormData({})
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveConfiguration} disabled={saving}>
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isCreating ? 'Create' : 'Save Changes'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Configuration Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a configuration from the list or create a new one to get started.
                </p>
                <Button onClick={startCreating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Configuration
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}