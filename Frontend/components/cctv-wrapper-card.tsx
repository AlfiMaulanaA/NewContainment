"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MonitorPlay,
  Grid3X3,
  Grid2X2,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Settings,
  RefreshCw,
} from "lucide-react";
import ModernCCTVWidget from "@/components/cctv-widget-modern";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GridLayout = "1x1" | "2x2" | "3x3" | "4x2" | "auto";

interface CCTVWrapperCardProps {
  title?: string;
  description?: string;
  showHeader?: boolean;
  defaultLayout?: GridLayout;
  compact?: boolean;
}

export default function CCTVWrapperCard({
  title = "CCTV Surveillance",
  description = "Real-time monitoring from all active security cameras",
  showHeader = true,
  defaultLayout = "auto",
  compact = false,
}: CCTVWrapperCardProps) {
  const [currentLayout, setCurrentLayout] = useState<GridLayout>(defaultLayout);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const getGridClasses = (layout: GridLayout): string => {
    switch (layout) {
      case "1x1":
        return "w-full"; // Full width for single view
      case "2x2":
        return "grid grid-cols-1 lg:grid-cols-2 gap-6"; // 2 columns = 50% each
      case "3x3":
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"; // 3 columns = 33.33% each
      case "4x2":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"; // 4 columns = 25% each
      case "auto":
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    }
  };

  const getLayoutIcon = (layout: GridLayout) => {
    switch (layout) {
      case "1x1":
        return <Maximize2 className="h-4 w-4" />;
      case "2x2":
        return <Grid2X2 className="h-4 w-4" />;
      case "3x3":
        return <Grid3X3 className="h-4 w-4" />;
      case "4x2":
        return <LayoutGrid className="h-4 w-4" />;
      case "auto":
      default:
        return <LayoutGrid className="h-4 w-4" />;
    }
  };

  const getLayoutLabel = (layout: GridLayout): string => {
    switch (layout) {
      case "1x1":
        return "Single View";
      case "2x2":
        return "2x2 Grid";
      case "3x3":
        return "3x3 Grid";
      case "4x2":
        return "4x2 Grid";
      case "auto":
      default:
        return "Auto Layout";
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between p-4 bg-black/90 text-white border-b border-gray-700">
          <div className="flex items-center gap-3">
            <MonitorPlay className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-gray-300">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Grid Layout Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  {getLayoutIcon(currentLayout)}
                  <span className="ml-2">{getLayoutLabel(currentLayout)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(["auto", "1x1", "2x2", "3x3", "4x2"] as GridLayout[]).map((layout) => (
                  <DropdownMenuItem
                    key={layout}
                    onClick={() => setCurrentLayout(layout)}
                    className="flex items-center gap-2"
                  >
                    {getLayoutIcon(layout)}
                    {getLayoutLabel(layout)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <Minimize2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Fullscreen CCTV Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={getGridClasses(currentLayout)}>
            <ModernCCTVWidget key={refreshKey} layout={currentLayout} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${compact ? "border-0 shadow-sm" : "shadow-lg"} bg-white`}>
      {showHeader && (
        <CardHeader className={compact ? "pb-3" : "pb-4"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <MonitorPlay className="h-6 w-6 text-blue-600" />
                {title}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Active Cameras Count Badge */}
              <Badge variant="outline" className="text-xs">
                Live Feeds
              </Badge>

              {/* Grid Layout Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {getLayoutIcon(currentLayout)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {(["auto", "1x1", "2x2", "3x3", "4x2"] as GridLayout[]).map((layout) => (
                    <DropdownMenuItem
                      key={layout}
                      onClick={() => setCurrentLayout(layout)}
                      className="flex items-center gap-2"
                    >
                      {getLayoutIcon(layout)}
                      {getLayoutLabel(layout)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                title="Refresh CCTV feeds"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              {/* Fullscreen Button */}
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                title="Fullscreen view"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!compact && (
            <p className="text-sm text-gray-600 mt-2">{description}</p>
          )}
        </CardHeader>
      )}

      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className={getGridClasses(currentLayout)}>
          <ModernCCTVWidget key={refreshKey} layout={currentLayout} />
        </div>
      </CardContent>
    </Card>
  );
}