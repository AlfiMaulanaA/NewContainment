"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Clock, 
  Save,
  RefreshCw,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Server,
  Building,
  Globe,
  XCircle,
  AlertTriangle,
  Settings,
  Timer,
  Database,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  sensorIntervalsApi, 
  sensorIntervalHelpers,
  type SensorIntervalConfig, 
  type AvailableInterval 
} from '@/lib/api'

// Type aliases for compatibility
type IntervalConfig = SensorIntervalConfig

export default function SensorIntervalsConfig() {
  // State
  const [configurations, setConfigurations] = useState<IntervalConfig[]>([])
  const [availableIntervals, setAvailableIntervals] = useState<AvailableInterval[]>(() => {
    // Initialize with default intervals
    return sensorIntervalHelpers.getDefaultIntervals()
  })
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingConfig, setEditingConfig] = useState<IntervalConfig | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    saveIntervalMinutes: 15,
    isEnabled: true,
    configurationType: 'global' as 'global' | 'device' | 'containment',
    deviceId: '',
    containmentId: ''
  })

  // Load data
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Always set default intervals first as fallback
      const defaultIntervals = sensorIntervalHelpers.getDefaultIntervals()
      setAvailableIntervals(defaultIntervals)
      
      // Load configurations from API
      try {
        const configurationsResult = await sensorIntervalsApi.getConfigurations()
        if (configurationsResult.success && configurationsResult.data) {
          setConfigurations(configurationsResult.data)
        } else {
          setConfigurations([])
        }
      } catch (configError: any) {
        if (configError.message?.includes('authentication') || configError.message?.includes('Session expired')) {
          toast.error('Please login to view and manage sensor interval configurations')
        } else {
          toast.error('Failed to load configurations - check connection')
        }
        setConfigurations([])
      }
      
      // Try to load available intervals from API, fallback to defaults
      try {
        const intervalsResult = await sensorIntervalsApi.getAvailableIntervals()
        if (intervalsResult.success && intervalsResult.data) {
          setAvailableIntervals(intervalsResult.data)
        }
      } catch (intervalError) {
        // Keep using default intervals set above
      }
      
    } catch (error) {
      toast.error('Failed to load configurations - using defaults')
      // Ensure we always have default intervals
      setAvailableIntervals(sensorIntervalHelpers.getDefaultIntervals())
      setConfigurations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Form handlers
  const handleCreateNew = () => {
    setIsCreating(true)
    setEditingConfig(null)
    setFormData({
      name: '',
      description: '',
      saveIntervalMinutes: 15,
      isEnabled: true,
      configurationType: 'global',
      deviceId: '',
      containmentId: ''
    })
  }

  const handleEdit = (config: IntervalConfig) => {
    setIsCreating(false)
    setEditingConfig(config)
    setFormData({
      name: config.name,
      description: config.description || '',
      saveIntervalMinutes: config.saveIntervalMinutes,
      isEnabled: config.isEnabled,
      configurationType: config.isGlobalConfiguration ? 'global' : config.deviceId ? 'device' : 'containment',
      deviceId: config.deviceId?.toString() || '',
      containmentId: config.containmentId?.toString() || ''
    })
  }

  const handleSave = async () => {
    try {
      const configData = {
        name: formData.name,
        description: formData.description,
        saveIntervalMinutes: formData.saveIntervalMinutes,
        isEnabled: formData.isEnabled,
        isGlobalConfiguration: formData.configurationType === 'global',
        deviceId: formData.configurationType === 'device' ? parseInt(formData.deviceId) : undefined,
        containmentId: formData.configurationType === 'containment' ? parseInt(formData.containmentId) : undefined
      }

      let result
      if (editingConfig) {
        result = await sensorIntervalsApi.updateConfiguration(editingConfig.id, configData)
      } else {
        result = await sensorIntervalsApi.createConfiguration(configData)
      }

      if (result.success) {
        toast.success(editingConfig ? 'Configuration updated successfully' : 'Configuration created successfully')
        setIsCreating(false)
        setEditingConfig(null)
        loadData()
      } else {
        toast.error(result.message || 'Failed to save configuration')
      }
    } catch (error) {
      toast.error('Failed to save configuration')
    }
  }

  const handleDelete = async (config: IntervalConfig) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return
    }

    try {
      const result = await sensorIntervalsApi.deleteConfiguration(config.id)
      if (result.success) {
        toast.success('Configuration deleted successfully')
        loadData()
      } else {
        toast.error(result.message || 'Failed to delete configuration')
      }
    } catch (error) {
      toast.error('Failed to delete configuration')
    }
  }

  const handleToggle = async (config: IntervalConfig) => {
    try {
      const result = await sensorIntervalsApi.toggleConfiguration(config.id, !config.isEnabled)
      if (result.success) {
        toast.success(`Configuration ${!config.isEnabled ? 'enabled' : 'disabled'} successfully`)
        loadData()
      } else {
        toast.error(result.message || 'Failed to toggle configuration')
      }
    } catch (error) {
      toast.error('Failed to toggle configuration')
    }
  }

  const handleQuickGlobalSet = async (intervalMinutes: number) => {
    try {
      const result = await sensorIntervalsApi.setGlobalInterval(intervalMinutes)
      if (result.success) {
        toast.success('Global interval set successfully')
        loadData()
      } else {
        toast.error(result.message || 'Failed to set global interval')
      }
    } catch (error) {
      toast.error('Failed to set global interval')
    }
  }

  // Helper functions
  const getConfigTypeIcon = (config: IntervalConfig) => {
    if (config.isGlobalConfiguration) return <Globe className="h-4 w-4 text-blue-600" />
    if (config.deviceId) return <Server className="h-4 w-4 text-green-600" />
    if (config.containmentId) return <Building className="h-4 w-4 text-purple-600" />
    return <Globe className="h-4 w-4 text-gray-600" />
  }

  const getConfigTypeLabel = (config: IntervalConfig) => {
    return sensorIntervalHelpers.getConfigTypeLabel(config)
  }

  const getIntervalLabel = (minutes: number) => {
    const interval = availableIntervals.find(i => i.value === minutes)
    return interval?.label || sensorIntervalHelpers.formatInterval(minutes)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold">Sensor Data Intervals</h3>
            <p className="text-sm text-muted-foreground">
              Configure sensor data save intervals: 1min, 15min, 30min, 1h, 6h, 12h, 24h
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew} size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Configuration
        </Button>
      </div>

      {/* Quick Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Quick Global Settings
          </CardTitle>
          <CardDescription>
            Set global interval that applies to all devices without specific configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableIntervals.filter(interval => interval && interval.value != null).map((interval, index) => (
              <Button
                key={`interval-${interval.value}-${index}`}
                variant="outline"
                size="sm"
                onClick={() => handleQuickGlobalSet(interval.value)}
                className="flex items-center gap-2"
              >
                <Clock className="h-3 w-3" />
                {interval.label || `${interval.value} minutes`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      {(isCreating || editingConfig) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingConfig ? 'Edit Configuration' : 'Create New Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Configuration name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Save Interval</Label>
                <Select
                  value={formData.saveIntervalMinutes.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, saveIntervalMinutes: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIntervals.filter(interval => interval && interval.value != null).map((interval, index) => (
                      <SelectItem 
                        key={`select-interval-${interval.value}-${index}`} 
                        value={interval.value.toString()}
                      >
                        {interval.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Configuration Type</Label>
                <Select
                  value={formData.configurationType}
                  onValueChange={(value: 'global' | 'device' | 'containment') => 
                    setFormData(prev => ({ ...prev, configurationType: value }))}
                  disabled={!!editingConfig}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                        Global
                      </div>
                    </SelectItem>
                    <SelectItem value="device">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-green-600" />
                        Device Specific
                      </div>
                    </SelectItem>
                    <SelectItem value="containment">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-purple-600" />
                        Containment Specific
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </div>

            {formData.configurationType === 'device' && (
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  type="number"
                  value={formData.deviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                  placeholder="Enter device ID"
                />
              </div>
            )}

            {formData.configurationType === 'containment' && (
              <div className="space-y-2">
                <Label htmlFor="containmentId">Containment ID</Label>
                <Input
                  id="containmentId"
                  type="number"
                  value={formData.containmentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, containmentId: e.target.value }))}
                  placeholder="Enter containment ID"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Configuration description"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {editingConfig ? 'Update' : 'Create'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false)
                  setEditingConfig(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              <span>Current Configurations</span>
            </div>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No configurations found. Create your first interval configuration to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {configurations.map((config, index) => (
                <div key={`config-${config.id}-${index}`} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getConfigTypeIcon(config)}
                      <div>
                        <h4 className="font-semibold">{config.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getConfigTypeLabel(config)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={config.isEnabled ? "default" : "secondary"}>
                        {config.isEnabled ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Disabled
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline" className="font-mono">
                        <Clock className="h-3 w-3 mr-1" />
                        {getIntervalLabel(config.saveIntervalMinutes)}
                      </Badge>
                    </div>
                  </div>

                  {config.description && (
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Created: {new Date(config.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggle(config)}
                        title={config.isEnabled ? "Disable" : "Enable"}
                      >
                        {config.isEnabled ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-gray-400" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(config)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}