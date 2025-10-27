"use client";

import { useState, useEffect, useMemo } from "react";
import Status from "./containment-status-realtime-tabs";
// import Status from "./containment-status-tabs"; // OLD: Database-polled status
import Sensor from "./containment-average-sensor-tabs";
import Control from "./containment-control-tabs";
import Racks from "./containment-racks-tabs";
import CCTVWrapperCard from "@/components/cctv-wrapper-card";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { BarChart, Gauge, Eye } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

interface ContainmentData {
  id: number;
  type: number;
}

interface Dashboard2Props {
  containmentData?: ContainmentData | null;
  displayType?: "scroll" | "carousel";
  carouselMode?: "manual" | "automatic";
}

export default function Dashboard2({
  containmentData,
  displayType = "scroll",
  carouselMode = "manual",
}: Dashboard2Props) {
  const { preferences } = useDashboardPreferences();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(
    carouselMode === "automatic"
  );

  // Autoplay plugin for section carousel
  const autoplayPlugin = useMemo(() => {
    try {
      return Autoplay({
        delay:
          carouselMode === "automatic"
            ? preferences.carouselInterval * 1000
            : 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      });
    } catch (error) {
      console.warn("Failed to initialize section autoplay plugin:", error);
      return null;
    }
  }, [carouselMode, preferences.carouselInterval]);

  // Section components for Dashboard 2 layout - conditionally include CCTV section
  const sections = useMemo(() => {
    const baseSections = [
      {
        id: "section-1",
        title: "Status & Analytics",
        icon: <BarChart className="h-5 w-5" />,
        component: (
          <div className="sec-1 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Status />
            <Control />
          </div>
        ),
      },
      {
        id: "section-2",
        title: "Control & Racks",
        icon: <Gauge className="h-5 w-5" />,
        component: (
          <div className="sec-2 gap-4">
            <Sensor />
            <Racks />
          </div>
        ),
      },
    ];

    // Only add CCTV section if enabled
    if (preferences.cctvSettings.enabled) {
      baseSections.push({
        id: "section-3",
        title: "CCTV Monitoring",
        icon: <Eye className="h-5 w-5" />,
        component: (
          <div className="sec-3">
            <CCTVWrapperCard />
          </div>
        ),
      });
    }

    return baseSections;
  }, [preferences.cctvSettings.enabled]);

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

  // Carousel view
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
