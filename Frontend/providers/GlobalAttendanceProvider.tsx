"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useGlobalAttendanceLogger } from "@/hooks/useGlobalAttendanceLogger";

interface GlobalAttendanceContextType {
  isListening: boolean;
  isLoggingEnabled: boolean;
  stats: {
    messagesProcessed: number;
    successCount: number;
    errorCount: number;
  };
  startListening: () => void;
  stopListening: () => void;
}

const GlobalAttendanceContext =
  createContext<GlobalAttendanceContextType | null>(null);

export const useGlobalAttendanceContext = () => {
  const context = useContext(GlobalAttendanceContext);
  if (!context) {
    throw new Error(
      "useGlobalAttendanceContext must be used within GlobalAttendanceProvider"
    );
  }
  return context;
};

interface GlobalAttendanceProviderProps {
  children: React.ReactNode;
  showDebugLogs?: boolean;
}

export const GlobalAttendanceProvider: React.FC<
  GlobalAttendanceProviderProps
> = ({ children, showDebugLogs = false }) => {
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const {
    isListening,
    isLoggingEnabled,
    stats,
    startListening,
    stopListening,
  } = useGlobalAttendanceLogger({
    autoStart: true, // Always auto-start
    onLogMessage: (message, type) => {
      if (showDebugLogs) {
        setDebugMessages((prev) => [
          `[${new Date().toLocaleTimeString()}] ${type.toUpperCase()}: ${message}`,
          ...prev.slice(0, 9), // Keep last 10 messages
        ]);
      }
    },
  });

  useEffect(() => {
    if (showDebugLogs) {
      console.log("🚀 GlobalAttendanceProvider initialized", {
        isListening,
        isLoggingEnabled,
        stats,
      });
    }
  }, [isListening, isLoggingEnabled, stats, showDebugLogs]);

  const contextValue: GlobalAttendanceContextType = {
    isListening,
    isLoggingEnabled,
    stats,
    startListening,
    stopListening,
  };

  return (
    <GlobalAttendanceContext.Provider value={contextValue}>
      {children}
      {showDebugLogs && (
        <div
          style={{
            position: "fixed",
            bottom: "10px",
            right: "10px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            maxWidth: "400px",
            maxHeight: "200px",
            overflow: "auto",
            zIndex: 9999,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
            🎧 Global Attendance Logger
          </div>
          <div>Status: {isListening ? "🟢 Listening" : "🔴 Stopped"}</div>
          <div>Logging: {isLoggingEnabled ? "✅ Enabled" : "❌ Disabled"}</div>
          <div>
            Processed: {stats.messagesProcessed} | Success: {stats.successCount}{" "}
            | Errors: {stats.errorCount}
          </div>
          <div style={{ marginTop: "5px", fontSize: "10px" }}>
            {debugMessages.slice(0, 3).map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        </div>
      )}
    </GlobalAttendanceContext.Provider>
  );
};
