"use client";

import { Monitor, Tablet, Laptop } from "lucide-react";
import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ContainmentInfoTabs() {
  return (
    <div className="p-2">
      <Card className="max-w-2xl w-full p-2 shadow-sm">
        <CardContent className="p-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            {/* Responsive Text */}
            <div className="text-sm font-semibold text-muted-foreground">
              Responsive Page
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Tablet Card */}
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="bg-blue-500/10 dark:bg-blue-400/10 p-2 rounded-md border border-blue-500/20">
                  <Tablet size={24} className="text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-xs font-semibold text-center text-foreground">Tablet</h3>
              </div>

              {/* Laptop Card */}
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="bg-green-500/10 dark:bg-green-400/10 p-2 rounded-md border border-green-500/20">
                  <Laptop size={24} className="text-green-500 dark:text-green-400" />
                </div>
                <h3 className="text-xs font-semibold text-center text-foreground">Laptop</h3>
              </div>

              {/* Monitor Card */}
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="bg-red-500/10 dark:bg-red-400/10 p-2 rounded-md border border-red-500/20">
                  <Monitor size={24} className="text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xs font-semibold text-center text-foreground">Monitor</h3>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
