"use client";

import React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import UserActivityWidget from "@/components/user-activity-widget";

export default function UserActivityPage() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-lg font-semibold">User Activity Monitor</h1>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-muted-foreground">
          Monitor active users, login sessions, and user activity in real-time
        </p>

        <UserActivityWidget />
      </div>
    </SidebarInset>
  );
}