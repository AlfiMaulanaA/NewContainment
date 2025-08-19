"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { iconMap, getIconComponent } from "@/lib/icon-mapping";
import { Check, ChevronDown } from "lucide-react";

interface IconSelectorProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function IconSelector({ 
  value, 
  onChange, 
  label = "Icon", 
  placeholder = "Select icon...",
  className = ""
}: IconSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Get all available icons
  const availableIcons = Object.keys(iconMap);
  
  // Filter icons based on search
  const filteredIcons = availableIcons.filter(iconName =>
    iconName.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Group icons by category for better organization
  const iconCategories = {
    "Dashboard & Navigation": ["LayoutDashboard", "Home", "SlidersHorizontal", "Menu"],
    "Infrastructure": ["Server", "Users", "Activity", "Computer", "HardDrive", "Database"],
    "Security": ["Shield", "ShieldCheck", "ShieldAlert", "Lock", "FileLock", "DoorClosedLocked", "UserCheck", "Eye"],
    "Analytics": ["BarChart3", "FileText", "AlertTriangle"],
    "Communication": ["MessageCircle", "MessageCircleMore", "Smartphone"],
    "System & Tools": ["Settings", "Cog", "Wifi", "Network", "Radio", "Info", "InfoIcon", "Wrench"],
    "Sensors": ["Thermometer", "Gauge", "Zap", "Wind", "Droplets", "Sun", "CloudRain", "Waves", "Target", "Compass"],
    "Video & Camera": ["Video", "Camera", "VideoOff", "PlayCircle", "Monitor", "Webcam", "ScanLine", "Record"]
  };

  const SelectedIcon = getIconComponent(value);

  return (
    <div className={className}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between mt-1"
          >
            <div className="flex items-center gap-2">
              {value ? (
                <>
                  <SelectedIcon className="h-4 w-4" />
                  <span>{value}</span>
                </>
              ) : (
                placeholder
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search icons..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No icon found.</CommandEmpty>
              
              {/* Show all icons if searching */}
              {searchValue && (
                <CommandGroup heading="Search Results">
                  {filteredIcons.slice(0, 20).map((iconName) => {
                    const IconComponent = getIconComponent(iconName);
                    return (
                      <CommandItem
                        key={iconName}
                        value={iconName}
                        onSelect={() => {
                          onChange(iconName);
                          setOpen(false);
                          setSearchValue("");
                        }}
                        className="flex items-center gap-2"
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{iconName}</span>
                        {value === iconName && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* Show categorized icons when not searching */}
              {!searchValue && Object.entries(iconCategories).map(([category, icons]) => (
                <CommandGroup key={category} heading={category}>
                  {icons.map((iconName) => {
                    const IconComponent = getIconComponent(iconName);
                    return (
                      <CommandItem
                        key={iconName}
                        value={iconName}
                        onSelect={() => {
                          onChange(iconName);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{iconName}</span>
                        {value === iconName && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Show selected icon with preview */}
      {value && (
        <div className="mt-2 p-2 border rounded-md bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <SelectedIcon className="h-4 w-4 text-primary" />
            <span className="font-medium">Preview:</span>
            <Badge variant="secondary" className="text-xs">
              {value}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}