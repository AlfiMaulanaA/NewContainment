"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SensorAverageCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status: "normal" | "warning" | "critical" | "offline";
  count?: number;
  description?: string;
  variant?: "default" | "compact" | "detailed";
  className?: string;
  animate?: boolean;
}

const statusStyles = {
  normal: {
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
    border: "border-emerald-500/20 dark:border-emerald-400/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    hover: "hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20"
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-400/10",
    border: "border-amber-500/20 dark:border-amber-400/20",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    hover: "hover:bg-amber-50/50 dark:hover:bg-amber-900/20"
  },
  critical: {
    bg: "bg-red-500/10 dark:bg-red-400/10",
    border: "border-red-500/20 dark:border-red-400/20",
    icon: "text-red-600 dark:text-red-400",
    badge: "bg-red-500/10 text-red-700 dark:text-red-300",
    hover: "hover:bg-red-50/50 dark:hover:bg-red-900/20"
  },
  offline: {
    bg: "bg-gray-500/10 dark:bg-gray-400/10",
    border: "border-gray-500/20 dark:border-gray-400/20",
    icon: "text-gray-500 dark:text-gray-400",
    badge: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
    hover: "hover:bg-gray-50/50 dark:hover:bg-gray-900/20"
  }
};

export function SensorAverageCard({
  title,
  value,
  unit = "",
  icon: Icon,
  status,
  count,
  description,
  variant = "default",
  className,
  animate = true
}: SensorAverageCardProps) {
  const styles = statusStyles[status];
  const displayValue = typeof value === 'number' ? value.toFixed(2) : value;

  const isCompact = variant === "compact";
  const isDetailed = variant === "detailed";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 border-2",
        styles.border,
        styles.hover,
        "hover:shadow-lg hover:scale-[1.02]",
        animate && status === "critical" && "animate-pulse",
        className
      )}
    >
      {/* Status indicator line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        status === "normal" && "bg-emerald-500",
        status === "warning" && "bg-amber-500",
        status === "critical" && "bg-red-500",
        status === "offline" && "bg-gray-400"
      )} />

      <CardContent className={cn(
        "flex items-center gap-3 p-4",
        isCompact && "p-3",
        isDetailed && "p-6"
      )}>
        {/* Icon */}
        <div className={cn(
          "rounded-full p-2",
          styles.bg,
          isCompact && "p-1.5",
          isDetailed && "p-3"
        )}>
          <Icon className={cn(
            "h-6 w-6",
            styles.icon,
            isCompact && "h-4 w-4",
            isDetailed && "h-8 w-8"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={cn(
              "font-medium text-muted-foreground truncate",
              isCompact && "text-sm",
              isDetailed && "text-base"
            )}>
              {title}
            </h4>
            
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2 py-0.5 border-0",
                styles.badge,
                isCompact && "text-[10px] px-1"
              )}
            >
              {status}
            </Badge>
          </div>

          {/* Value */}
          <div className={cn(
            "text-2xl font-bold text-foreground mb-1",
            isCompact && "text-xl",
            isDetailed && "text-3xl"
          )}>
            {displayValue}{unit}
          </div>

          {/* Additional Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {count && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                {count} sensor{count !== 1 ? 's' : ''}
              </span>
            )}
            
            {description && !isCompact && (
              <span className="truncate ml-2">{description}</span>
            )}
          </div>

          {/* Detailed description */}
          {isDetailed && description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Trend indicator */}
        {isDetailed && (
          <div className="flex flex-col items-end text-xs text-muted-foreground">
            <div className="text-lg">📈</div>
            <span>Live</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}