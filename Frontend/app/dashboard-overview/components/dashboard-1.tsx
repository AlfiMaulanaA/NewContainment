"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { containmentsApi } from "@/lib/api";
import Status from "./containment-status-realtime-tabs";
// import Status from "./containment-status-tabs"; // OLD: Database-polled status
import Racks from "./containment-racks-tabs";
import Users from "./containment-user-tabs";
import Info from "./containment-info-tabs";
import Control from "./containment-control-tabs";
import InfoUser from "./containment-user-login-tabs";
import Sensor from "./containment-average-sensor-tabs";
import PowerManagement from "./containment-power-management-tabs";
import CCTVWrapperCard from "@/components/cctv-wrapper-card";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import {
  Layout,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  Monitor,
} from "lucide-react";
import { RealtimeClock } from "@/components/RealtimeClock";
import Autoplay from "embla-carousel-autoplay";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

interface ContainmentData {
  id: number;
  type: number;
}

interface Dashboard1Props {
  containmentData?: ContainmentData | null;
  displayType?: "scroll" | "carousel";
  carouselMode?: "manual" | "automatic";
}

export default function Dashboard1({
  containmentData,
  displayType = "scroll",
  carouselMode = "manual",
}: Dashboard1Props) {
  const { preferences } = useDashboardPreferences();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(
    carouselMode === "automatic"
  );

  // Hide Info component if ContainmentId === 1 and type === 2
  const shouldShowInfo = !(
    containmentData?.id === 1 && containmentData?.type === 2
  );

  // Autoplay plugin for section carousel
  const autoplayPlugin = useMemo(() => {
    try {
      return Autoplay({
        delay:
          carouselMode === "automatic"
            ? preferences.carouselInterval * 1000
            : 0, // Use dynamic interval
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      });
    } catch (error) {
      console.warn("Failed to initialize section autoplay plugin:", error);
      return null;
    }
  }, [carouselMode, preferences.carouselInterval]);

  // Section components - rearranged: Power Management (3), CCTV (4)
  const sections = useMemo(() => {
    const baseSections = [
      {
        id: "section-1",
        title: "Status & Control",
        icon: <Monitor className="h-5 w-5" />,
        component: (
          <div className="sec-1 space-y-6">
            <InfoUser />
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
              {/* Left Column (60% width) */}
              <div className="flex flex-col gap-4">
                <Status />
              </div>
              {/* Right Column (40% width) */}
              <div className="flex flex-col gap-2">
                <Control />
                {/* {shouldShowInfo && <Info />} */}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "section-2",
        title: "Sensors & Racks",
        icon: <Layout className="h-5 w-5" />,
        component: (
          <div className="sec-2 space-y-4">
            <Sensor />
            <Racks />
          </div>
        ),
      },
      {
        id: "section-3",
        title: "Power Management",
        icon: <Play className="h-5 w-5" />,
        component: (
          <div className="sec-3">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Power Distribution Unit (PDU)</h2>
            </div>
            <PowerManagement />
          </div>
        ),
      },
    ];

    // Only add CCTV section if enabled - now section 4
    if (preferences.cctvSettings.enabled) {
      baseSections.push({
        id: "section-4",
        title: "CCTV Monitoring",
        icon: <Eye className="h-5 w-5" />,
        component: (
          <div className="sec-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5" />
              <h2 className="text-xl font-semibold">CCTV Monitoring</h2>
            </div>
            <CCTVWrapperCard />
          </div>
        ),
      });
    }

    return baseSections;
  }, [shouldShowInfo, preferences.cctvSettings.enabled]);

  // Carousel initialization
  useEffect(() => {
    if (!carouselApi || displayType !== "carousel") return;

    setCount(carouselApi.scrollSnapList().length);
    setCurrent(carouselApi.selectedScrollSnap() + 1);

    const onSelect = () => {
      setCurrent(carouselApi.selectedScrollSnap() + 1);
    };

    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, displayType]);

  // Autoplay control
  useEffect(() => {
    setIsAutoPlaying(carouselMode === "automatic");
    if (carouselApi && autoplayPlugin && displayType === "carousel") {
      const timer = setTimeout(() => {
        try {
          if (carouselMode === "automatic") {
            autoplayPlugin.play();
          } else {
            autoplayPlugin.stop();
          }
        } catch (error) {
          console.warn("Section autoplay plugin error:", error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [carouselMode, autoplayPlugin, carouselApi, displayType]);

  // Toggle autoplay
  const toggleAutoPlay = () => {
    if (!autoplayPlugin) return;

    if (isAutoPlaying) {
      autoplayPlugin.stop();
    } else {
      autoplayPlugin.play();
    }
    setIsAutoPlaying(!isAutoPlaying);
  };

  // Scroll view (original layout)
  if (displayType === "scroll") {
    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id}>{section.component}</div>
        ))}
      </div>
    );
  }

  // Carousel view (new section-based carousel)
  return (
    <div className="space-y-4">
      {/* Section Carousel */}
      <Carousel
        setApi={setCarouselApi}
        className="w-full"
        plugins={
          carouselMode === "automatic" && autoplayPlugin ? [autoplayPlugin] : []
        }
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent>
          {sections.map((section) => (
            <CarouselItem key={section.id}>
              <div className="w-full">{section.component}</div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Simple Dot Indicators */}
      <div className="flex justify-center gap-2">
        {sections.map((_, index) => (
          <button
            key={index}
            onClick={() => carouselApi?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              current === index + 1
                ? "bg-primary"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
