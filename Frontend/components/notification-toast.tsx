"use client";

import { useEffect } from "react";
import Swal from "sweetalert2";

interface NotificationToastProps {
  type: "face" | "palm";
  result: {
    name: string;
    success: boolean;
    authorized?: boolean;
    score?: number;
    distance?: number;
  };
  onClose?: () => void;
}

export function NotificationToast({
  type,
  result,
  onClose,
}: NotificationToastProps) {
  useEffect(() => {
    const showToast = () => {
      const isSuccess =
        type === "face"
          ? result.success && result.authorized
          : result.success && (result.score || 0) >= 0.8;

      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", Swal.stopTimer);
          toast.addEventListener("mouseleave", Swal.resumeTimer);
        },
        didClose: () => {
          onClose?.();
        },
      });

      if (isSuccess) {
        Toast.fire({
          icon: "success",
          title: `${type === "face" ? "👤" : "🖐️"} ${
            type === "face" ? "Face" : "Palm"
          } Recognition Success`,
          html: `
            <div class="text-left">
              <p class="font-semibold text-green-700">${result.name}</p>
              <p class="text-sm text-gray-600">
                ${
                  type === "face"
                    ? `Confidence: ${(
                        (1 - (result.distance || 0)) *
                        100
                      ).toFixed(1)}%`
                    : `Score: ${((result.score || 0) * 100).toFixed(1)}%`
                }
              </p>
              <p class="text-xs text-gray-500">${new Date().toLocaleTimeString()}</p>
            </div>
          `,
          background: "#f0fdf4",
          color: "#166534",
        });
      } else if (result.name === "No Face Detected") {
        Toast.fire({
          icon: "info",
          title: "👤 No Face Detected",
          text: "Please position your face clearly in front of the camera",
          background: "#eff6ff",
          color: "#1e40af",
        });
      } else if (result.name === "Unknown Person") {
        Toast.fire({
          icon: "warning",
          title: "❓ Unknown Person",
          html: `
            <div class="text-left">
              <p class="text-sm">Face detected but not recognized</p>
              <p class="text-xs text-gray-500">
                ${
                  type === "face"
                    ? `Confidence: ${(
                        (1 - (result.distance || 0)) *
                        100
                      ).toFixed(1)}%`
                    : `Score: ${((result.score || 0) * 100).toFixed(1)}%`
                }
              </p>
            </div>
          `,
          background: "#fefce8",
          color: "#a16207",
        });
      } else {
        Toast.fire({
          icon: "error",
          title: `🚫 ${type === "face" ? "Face" : "Palm"} Recognition Failed`,
          html: `
            <div class="text-left">
              <p class="font-semibold text-red-700">${result.name}</p>
              <p class="text-sm text-gray-600">Access denied</p>
              <p class="text-xs text-gray-500">${new Date().toLocaleTimeString()}</p>
            </div>
          `,
          background: "#fef2f2",
          color: "#dc2626",
        });
      }
    };

    showToast();
  }, [type, result, onClose]);

  return null;
}
