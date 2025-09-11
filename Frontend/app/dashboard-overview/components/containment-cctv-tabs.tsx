"use client";

import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import CCTVWrapperCard from "@/components/cctv-wrapper-card";

export default function DashboardCCTVSection() {
  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* CCTV Widget with Enhanced Wrapper */}
      <Suspense
        fallback={
          <Card className="shadow-lg bg-card">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {[...Array(3)].map((_, index) => (
                  <Card key={index} className="bg-card shadow-lg border border-border animate-pulse">
                    <div className="bg-muted px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
                      <div className="h-3 sm:h-4 bg-muted-foreground/20 rounded w-1/2"></div>
                    </div>
                    <CardContent className="p-3 sm:p-4">
                      <div className="w-full aspect-video bg-muted rounded-lg mb-3 sm:mb-4"></div>
                      <div className="bg-secondary rounded-lg p-2 sm:p-3">
                        <div className="flex justify-between">
                          <div className="flex gap-1 sm:gap-2">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="h-6 w-6 sm:h-8 sm:w-8 bg-muted rounded"></div>
                            ))}
                          </div>
                          <div className="flex gap-1 sm:gap-2">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="h-6 w-6 sm:h-8 sm:w-8 bg-muted rounded"></div>
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