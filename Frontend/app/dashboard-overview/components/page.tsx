"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Layout, RefreshCcw, CalendarClock } from "lucide-react";

import Status from "./containment-status-tabs";
import Sensor from "./containment-average-sensor-tabs";
import Control from "./containment-control-tabs";
import Racks from "./containment-racks-tabs";
import CCTV from "./containment-cctv-tabs";

export default function DashboardOverview() {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fungsi untuk memperbarui tanggal dan waktu
  const updateDateTime = () => {
    const now = new Date();
    const formattedDate = now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setCurrentDateTime(formattedDate);
  };

  // Efek samping untuk memperbarui waktu secara real-time
  useEffect(() => {
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000); // Update setiap 1 detik
    return () => clearInterval(intervalId); // Membersihkan interval saat komponen dilepas
  }, []);

  // Handler untuk tombol refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulasikan proses refresh data yang memakan waktu 2 detik.
    // Ganti logika ini dengan fungsi pengambilan data Anda yang sebenarnya.
    setTimeout(() => {
      setIsRefreshing(false);
      console.log("Data refreshed!");
    }, 2000);
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          {/* Komponen SidebarTrigger Anda tetap di sini */}
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <Layout className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            IOT Containment Monitoring
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden md:inline">{currentDateTime}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span className="sr-only md:not-sr-only md:ml-2">Refresh</span>
          </Button>
        </div>
      </header>

      {/* Di sini, letakkan kembali komponen-komponen lain yang Anda miliki */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* <InfoUser /> */}
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          {/* Left Column (60% width) */}
          <div className="flex flex-col gap-4">
            {/* Pastikan Anda sudah mengimpor komponen ini */}
            <Status />
          </div>

          {/* Right Column (40% width) */}
          <div className="flex flex-col gap-2">
            <Control />
            {/* <Info /> */}
            {/* <Users /> */}
          </div>
        </div>
        <Sensor />
        <Racks />
        <CCTV />
      </div>
    </SidebarInset>
  );
}
