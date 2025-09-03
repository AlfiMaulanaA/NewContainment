"use client";

import { Droplet, Thermometer, Bolt, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

// Function to generate dummy sensor values
const generateDummyData = () => ({
  humidity: (Math.random() * (70 - 40) + 40).toFixed(1),
  temperature: (Math.random() * (30 - 20) + 20).toFixed(1),
  power: (Math.random() * (150 - 100) + 100).toFixed(2),
});

export default function SensorDashboard() {
  const [sensorData, setSensorData] = useState(generateDummyData());

  // Update dummy data every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(generateDummyData());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const cardData = [
    {
      title: "Humidity",
      value: `${sensorData.humidity}%`,
      icon: <Droplet className="h-8 w-8 text-blue-500" />, // Diperkecil dari h-12 w-12
      color: "bg-blue-100",
    },
    {
      title: "Temperature",
      value: `${sensorData.temperature}°C`,
      icon: <Thermometer className="h-8 w-8 text-red-500" />, // Diperkecil dari h-12 w-12
      color: "bg-red-100",
    },
    {
      title: "Power",
      value: `${sensorData.power} W`,
      icon: <Bolt className="h-8 w-8 text-yellow-500" />, // Diperkecil dari h-12 w-12
      color: "bg-yellow-100",
    },
  ];

  return (
    <div className="">
      <Card className="w-full max-w-4xl rounded-lg mx-auto">
        <CardHeader className="mb-2">
          <CardTitle className="flex items-center gap-1 md:gap-2 text-xl md:text-2xl font-bold text-primary">
            <Activity className="h-4 w-5 md:h-8 md:w-6 text-green-500" />
            Average Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Gap antar kartu dikurangi */}
            {cardData.map((card, index) => (
              <Card
                key={index}
                className="flex-1 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300" // Shadow dan border-radius sedikit dikurangi
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-2 rounded-full ${card.color}`}>
                    {card.icon}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-base font-medium text-primary">
                      {card.title}
                    </div>
                    <div className="text-3xl font-bold text-primary mt-0.5">
                      {card.value}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
