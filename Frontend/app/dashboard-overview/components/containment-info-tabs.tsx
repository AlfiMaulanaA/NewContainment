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
            <div className="text-sm font-semibold text-gray-600">
              Responsive Page
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Tablet Card */}
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="bg-blue-100 p-2 rounded-md">
                  <Tablet size={24} className="text-blue-500" />
                </div>
                <h3 className="text-xs font-semibold text-center">Tablet</h3>
              </div>

              {/* Laptop Card */}
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="bg-green-100 p-2 rounded-md">
                  <Laptop size={24} className="text-green-500" />
                </div>
                <h3 className="text-xs font-semibold text-center">Laptop</h3>
              </div>

              {/* Monitor Card */}
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="bg-red-100 p-2 rounded-md">
                  <Monitor size={24} className="text-red-500" />
                </div>
                <h3 className="text-xs font-semibold text-center">Monitor</h3>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
