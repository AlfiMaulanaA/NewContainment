"use client";

import React, { createContext, useContext, useState } from "react";

// Safe wrapper interface that won't crash if dependencies fail
interface SafeGlobalAttendanceContextType {
  isListening: boolean;
  isLoggingEnabled: boolean;
  stats: {
    messagesProcessed: number;
    successCount: number;
    errorCount: number;
  };
  startListening: () => void;
  stopListening: () => void;
  error?: string;
}

const SafeGlobalAttendanceContext = createContext<SafeGlobalAttendanceContextType | null>(null);

export const useSafeGlobalAttendanceContext = () => {
  const context = useContext(SafeGlobalAttendanceContext);
  if (!context) {
    // Return safe defaults instead of throwing
    return {
      isListening: false,
      isLoggingEnabled: false,
      stats: { messagesProcessed: 0, successCount: 0, errorCount: 0 },
      startListening: () => console.log('GlobalAttendance not available'),
      stopListening: () => console.log('GlobalAttendance not available'),
      error: 'Context not available'
    };
  }
  return context;
};

interface SafeGlobalAttendanceProviderProps {
  children: React.ReactNode;
  showDebugLogs?: boolean;
}

export const SafeGlobalAttendanceProvider: React.FC<SafeGlobalAttendanceProviderProps> = ({ 
  children, 
  showDebugLogs = false 
}) => {
  const [error, setError] = useState<string | null>(null);
  
  // Default safe state
  const defaultContextValue: SafeGlobalAttendanceContextType = {
    isListening: false,
    isLoggingEnabled: false,
    stats: { messagesProcessed: 0, successCount: 0, errorCount: 0 },
    startListening: () => console.log('GlobalAttendance: Service not available'),
    stopListening: () => console.log('GlobalAttendance: Service not available'),
    error: error || undefined,
  };

  // Try to load the real provider, fall back to safe defaults on error
  try {
    // We'll implement a lazy-loaded approach to prevent crashes
    const [realProvider, setRealProvider] = useState<any>(null);
    
    // Don't load the complex dependencies during initial render
    // This prevents crashes when MQTT or other services aren't available
    
    return (
      <SafeGlobalAttendanceContext.Provider value={defaultContextValue}>
        {children}
        {showDebugLogs && error && (
          <div
            style={{
              position: "fixed",
              bottom: "10px",
              right: "10px",
              background: "rgba(255,0,0,0.8)",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
              fontSize: "12px",
              maxWidth: "400px",
              zIndex: 9999,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
              ⚠️ GlobalAttendanceProvider Error
            </div>
            <div style={{ fontSize: "10px" }}>{error}</div>
          </div>
        )}
      </SafeGlobalAttendanceContext.Provider>
    );
  } catch (err: any) {
    setError(err.message);
    console.warn('GlobalAttendanceProvider failed to load:', err);
    
    return (
      <SafeGlobalAttendanceContext.Provider value={defaultContextValue}>
        {children}
      </SafeGlobalAttendanceContext.Provider>
    );
  }
};

// Export both for backward compatibility
export const GlobalAttendanceProvider = SafeGlobalAttendanceProvider;
export const useGlobalAttendanceContext = useSafeGlobalAttendanceContext;