"use client";

import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import CCTVWrapperCard from "@/components/cctv-wrapper-card";

export default function DashboardCCTVSection() {
  return (
    <div className="space-y-6">
      {/* CCTV Widget with Enhanced Wrapper */}
      <Suspense
        fallback={
          <Card className="shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(3)].map((_, index) => (
                  <Card key={index} className="bg-white shadow-lg border border-gray-200 animate-pulse">
                    <div className="bg-gray-200 px-4 py-3 border-b">
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    </div>
                    <CardContent className="p-4">
                      <div className="w-full aspect-video bg-gray-300 rounded-lg mb-4"></div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex justify-between">
                          <div className="flex gap-2">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="h-8 w-8 bg-gray-300 rounded"></div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="h-8 w-8 bg-gray-300 rounded"></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        }
      >
        <CCTVWrapperCard
          title="CCTV Surveillance"
          description="Real-time monitoring from all active security cameras"
          showHeader={true}
          defaultLayout="auto"
          compact={false}
        />
      </Suspense>
    </div>
  );
}