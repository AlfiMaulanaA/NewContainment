import React from 'react';
import {
  LayoutDashboard,
  Home,
  SlidersHorizontal,
  Server,
  Users,
  Activity,
  Computer,
  HardDrive,
  Thermometer,
  Wrench,
  MessageCircle,
  Shield,
  Video,
  Lock,
  BarChart3,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Eye,
  Settings,
  Wifi,
  Radio,
  Info,
  Menu,
  Network,
  Database,
  MessageCircleMore,
  FileLock,
  DoorClosedLocked,
  ShieldAlert,
  InfoIcon,
  Cog,
  // Additional sensor icons
  Gauge,
  Zap,
  Wind,
  Droplets,
  Sun,
  CloudRain,
  Waves,
  Target,
  Compass,
  // Additional video/camera icons
  Camera,
  VideoOff,
  PlayCircle,
  Monitor,
  Webcam,
  ScanLine
} from 'lucide-react';

// Icon mapping for dynamic menu system
export const iconMap: Record<string, React.ComponentType<any>> = {
  // Dashboard icons
  'LayoutDashboard': LayoutDashboard,
  'Home': Home,
  'SlidersHorizontal': SlidersHorizontal,
  
  // Infrastructure icons
  'Server': Server,
  'Users': Users,
  'Activity': Activity,
  'Computer': Computer,
  'HardDrive': HardDrive,
  'Database': Database,
  'Thermometer': Thermometer,
  'Gauge': Gauge,
  'Zap': Zap,
  'Wind': Wind,
  'Droplets': Droplets,
  'Sun': Sun,
  'CloudRain': CloudRain,
  'Waves': Waves,
  'Target': Target,
  'Compass': Compass,
  'Wrench': Wrench,
  'MessageCircle': MessageCircle,
  'MessageCircleMore': MessageCircleMore,
  
  // Security icons
  'Shield': Shield,
  'ShieldCheck': ShieldCheck,
  'ShieldAlert': ShieldAlert,
  'Video': Video,
  'Camera': Camera,
  'VideoOff': VideoOff,
  'PlayCircle': PlayCircle,
  'Monitor': Monitor,
  'Webcam': Webcam,
  'ScanLine': ScanLine,
  'Lock': Lock,
  'FileLock': FileLock,
  'DoorClosedLocked': DoorClosedLocked,
  'Smartphone': Smartphone,
  'UserCheck': UserCheck,
  'Eye': Eye,
  
  // Analytics icons
  'BarChart3': BarChart3,
  'FileText': FileText,
  'AlertTriangle': AlertTriangle,
  
  // Configuration icons
  'Settings': Settings,
  'Cog': Cog,
  'Wifi': Wifi,
  'Network': Network,
  'Radio': Radio,
  'Info': Info,
  'InfoIcon': InfoIcon,
  
  // Management icons
  'Menu': Menu,
};

// Get icon component by name, with fallback
export function getIconComponent(iconName?: string): React.ComponentType<any> {
  if (!iconName) return Menu; // Default fallback icon
  
  const IconComponent = iconMap[iconName];
  return IconComponent || Menu; // Fallback to Menu icon if not found
}

// Helper function to render icon with props
export function renderIcon(iconName?: string, props: any = {}) {
  const IconComponent = getIconComponent(iconName);
  return <IconComponent {...props} />;
}