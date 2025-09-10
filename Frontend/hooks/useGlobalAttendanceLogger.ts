import { useEffect, useCallback, useState } from "react";
import { useMQTT } from "@/hooks/useMQTT";
import { globalAttendanceLogger } from "@/services/GlobalAttendanceLogger";

export interface AttendanceLoggerOptions {
  autoStart?: boolean;
  onLogMessage?: (message: string, type: "success" | "error") => void;
}

export const useGlobalAttendanceLogger = (
  options: AttendanceLoggerOptions = {}
) => {
  const { autoStart = true, onLogMessage } = options;

  const { isConnected, subscribe, unsubscribe } = useMQTT();
  const [isListening, setIsListening] = useState(false);
  const [stats, setStats] = useState({
    messagesProcessed: 0,
    successCount: 0,
    errorCount: 0,
  });

  const attendanceTopic = "accessControl/attendance/live";

  // Handle MQTT messages
  const handleAttendanceMessage = useCallback(
    async (topic: string, message: string) => {
      console.log(`[DEBUG] MQTT message received from topic: ${topic}`, message);
      
      setStats((prev) => {
        const newStats = {
          ...prev,
          messagesProcessed: prev.messagesProcessed + 1,
        };
        return newStats;
      });

      const success = await globalAttendanceLogger.handleMqttMessage(
        topic,
        message
      );

      setStats((prev) => ({
        ...prev,
        successCount: success ? prev.successCount + 1 : prev.successCount,
        errorCount: !success ? prev.errorCount + 1 : prev.errorCount,
      }));
      
      console.log(`[DEBUG] Message processing result: ${success ? 'SUCCESS' : 'FAILED'}`);
    },
    []
  );

  // Start listening to MQTT attendance messages
  const startListening = useCallback(() => {
    console.log(`[DEBUG] startListening called - isConnected: ${isConnected}, isListening: ${isListening}, topic: ${attendanceTopic}`);
    
    if (isConnected && !isListening) {
      console.log(`[DEBUG] Attempting to subscribe to topic: ${attendanceTopic}`);
      const subscriptionResult = subscribe(attendanceTopic, handleAttendanceMessage);
      console.log(`[DEBUG] Subscription result:`, subscriptionResult);
      
      setIsListening(true);
      console.log(`[DEBUG] Successfully subscribed to ${attendanceTopic} - isListening set to true`);
    } else {
      console.log(`[DEBUG] Subscription not attempted - isConnected: ${isConnected}, isListening: ${isListening}`);
    }
  }, [
    isConnected,
    isListening,
    subscribe,
    handleAttendanceMessage,
    attendanceTopic,
  ]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (isListening) {
      unsubscribe(attendanceTopic);
      setIsListening(false);
    }
  }, [isListening, unsubscribe, attendanceTopic]);

  // Logging is always enabled - no toggle function

  // Setup log message callback
  useEffect(() => {
    if (onLogMessage) {
      globalAttendanceLogger.addLogCallback(onLogMessage);
      return () => {
        globalAttendanceLogger.removeLogCallback(onLogMessage);
      };
    }
  }, [onLogMessage]);

  // Removed tab management logic

  // Auto start/stop based on MQTT connection
  useEffect(() => {
    if (autoStart) {
      if (isConnected) {
        startListening();
      } else {
        stopListening();
      }
    }

    return () => {
      if (autoStart) {
        stopListening();
      }
    };
  }, [isConnected, autoStart, startListening, stopListening]);

  // Logger is always enabled - no initialization needed

  return {
    // State
    isListening,
    isConnected,
    isLoggingEnabled: true, // Always enabled
    stats,

    // Actions
    startListening,
    stopListening,

    // Direct access to logger instance for advanced use
    logger: globalAttendanceLogger,
  };
};

// Hook for components that just want to show logger status/stats
export const useAttendanceLoggerStatus = () => {
  const [logMessages, setLogMessages] = useState<
    Array<{ message: string; type: "success" | "error"; timestamp: Date }>
  >([]);

  useEffect(() => {
    const callback = (message: string, type: "success" | "error") => {
      setLogMessages((prev) => [
        { message, type, timestamp: new Date() },
        ...prev.slice(0, 49), // Keep last 50 messages
      ]);
    };

    globalAttendanceLogger.addLogCallback(callback);

    return () => {
      globalAttendanceLogger.removeLogCallback(callback);
    };
  }, []);

  return {
    isEnabled: true, // Always enabled
    logMessages,
    stats: globalAttendanceLogger.getStats(),
  };
};
