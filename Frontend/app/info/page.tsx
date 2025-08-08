"use client";

import {
  SiNodedotjs,
  SiPython,
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiHtml5,
  SiTailwindcss,
  SiCss3,
  SiMysql,
  SiDotnet,
} from "react-icons/si";

import {
  FileQuestion,
  Network,
  ServerCog,
  PlusCircle,
  BarChart2,
  AlertTriangle,
  RotateCw,
  SatelliteDish,
  GaugeCircle,
  HardDrive,
  Database,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function InfoFAQPage() {
  const techStack = [
    { name: "Next.js", icon: <SiNextdotjs size={32} className="text-black dark:text-white" /> },
    { name: "TypeScript", icon: <SiTypescript size={32} className="text-sky-600" /> },
    { name: "Tailwind CSS", icon: <SiTailwindcss size={32} className="text-cyan-500" /> },
    { name: "HTML", icon: <SiHtml5 size={32} className="text-orange-500" /> },
    { name: "CSS", icon: <SiCss3 size={32} className="text-blue-600" /> },
    { name: ".NET Core", icon: <SiDotnet size={38} className="text-white bg-purple-600 rounded-sm p-1" /> },
    { name: "MySQL", icon: <SiMysql size={32} className="text-sky-500" /> },
    { name: "Node.js", icon: <SiNodedotjs size={32} className="text-green-600" /> },
    { name: "Python", icon: <SiPython size={32} className="text-blue-500" /> },
    { name: "MQTT", icon: <SatelliteDish size={32} className="text-red-600" /> },
  ];

  const faqs = [
    {
      icon: <Network className="w-5 h-5 text-blue-600 mt-1" />,
      question: "What communication protocols are supported?",
      answer: "The system supports Modbus RTU/TCP and MQTT protocols for device communication, and SNMP for network equipment.",
    },
    {
      icon: <PlusCircle className="w-5 h-5 text-green-600 mt-1" />,
      question: "Can I add custom IoT devices?",
      answer: "Yes, the system is designed to be extensible. You can add, update, or delete custom IoT devices and their specific monitoring points via the Device Manager.",
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-yellow-500 mt-1" />,
      question: "What types of data are monitored?",
      answer: "The system monitors critical environmental and power data, including Temperature, Humidity, Smoke, Water Leaks, Voltage, Current, Power, and Energy consumption.",
    },
    {
      icon: <GaugeCircle className="w-5 h-5 text-purple-600 mt-1" />,
      question: "How does device status work?",
      answer: (
        <>
          A device's status is considered <strong>Online</strong> if it is actively sending data to the system and has a successful connection to the controller. If there is no data or connection, its status will be <strong>Offline</strong>.
        </>
      ),
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-red-600 mt-1" />,
      question: "What should I do if data isn't showing?",
      answer: "First, verify the physical and network connections of the device. Then, check the status of the MQTT broker and ensure all port and protocol settings are configured correctly.",
    },
    {
      icon: <Database className="w-5 h-5 text-gray-500 mt-1" />,
      question: "Where is the monitoring data stored?",
      answer: "All monitoring data is stored securely in a MySQL database for historical analysis, reporting, and real-time visualization.",
    },
  ];

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <FileQuestion className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Information & FAQ</h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.location.reload()}
          title="Reload page"
          aria-label="Reload"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </header>

      {/* Content */}
      <main className="px-6 md:px-12 lg:px-24 py-8 space-y-12 transition-all">
        {/* Info Section */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ServerCog className="w-5 h-5 text-primary" />
            <h2 className="text-3xl font-bold">Containment Mini Data Center IoT Monitoring System</h2>
          </div>
          <p className="text-muted-foreground max-w-3xl leading-relaxed">
            This system provides a comprehensive solution for <strong>real-time monitoring and control of a Containment Mini Data Center</strong>. It leverages IoT technology to collect critical environmental and power data from various sensors and devices. The system supports multiple industrial protocols and provides a web interface for intuitive visualization, management, and alerting, ensuring the data center operates under optimal conditions.
          </p>
        </section>

        <Separator />

        {/* FAQ Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileQuestion className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          </div>
          <ul className="space-y-6 text-sm sm:text-base">
            {faqs.map((faq, index) => (
              <li
                key={index}
                className="flex gap-3 p-4 rounded-xl hover:bg-accent/40 transition duration-300 shadow-sm"
              >
                {faq.icon}
                <div className="transition-all">
                  <strong className="block mb-1">{faq.question}</strong>
                  <span className="text-muted-foreground">{faq.answer}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Tech Stack Section */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ServerCog className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">Technology Stack</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            The system is built on a modern and robust technology stack to ensure high performance, scalability, and reliability.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="group p-4 rounded-2xl shadow-md transition-transform duration-300 hover:scale-105 hover:bg-primary/10 cursor-pointer"
              >
                <div className="flex flex-col items-center space-y-2">
                  {tech.icon}
                  <span className="text-sm font-medium group-hover:text-foreground">
                    {tech.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </SidebarInset>
  );
}