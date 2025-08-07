"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { Settings, Grid, List, Play, Pause } from "lucide-react";
import Link from "next/link";

export function DashboardSettingsShortcut() {
  const { preferences, isLoaded } = useDashboardPreferences();

  if (!isLoaded) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {preferences.isCarouselMode ? (
              <Grid className="h-3 w-3" />
            ) : (
              <List className="h-3 w-3" />
            )}
            <span>{preferences.isCarouselMode ? 'Carousel' : 'Scroll'}</span>
            
            {preferences.isCarouselMode && (
              <>
                <span className="text-muted-foreground/50">•</span>
                {preferences.autoPlayEnabled ? (
                  <Play className="h-3 w-3 text-green-600" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                <span>{preferences.autoPlayEnabled ? 'Auto' : 'Manual'}</span>
              </>
            )}
          </div>
          
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href="/settings/setting?tab=dashboard">
              <Settings className="h-3 w-3" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}