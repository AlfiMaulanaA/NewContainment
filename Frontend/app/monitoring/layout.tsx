import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real-time Monitoring | IoT Containment System",
  description: "Real-time monitoring dashboard for IoT sensors with MQTT integration and CCTV surveillance",
};

export default function MonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}