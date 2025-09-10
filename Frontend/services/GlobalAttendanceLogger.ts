import { AccessMethod, accessLogService } from "@/lib/api-service";

export interface AttendanceData {
  status: "success" | "failed";
  data: {
    deviceId: string;
    via: number;
    uid: string | null;
    name: string;
    message: string;
    device_name: string;
    access_action: string;
    timestamp: string;
    verify_code: number;
    punch_code: number;
  };
  event_type: string;
}

export class GlobalAttendanceLogger {
  private static instance: GlobalAttendanceLogger;
  private logCallbacks: Array<
    (message: string, type: "success" | "error") => void
  > = [];
  private attendanceCallbacks: Array<(attendance: AttendanceData) => void> = [];
  private processedMessageIds = new Set<string>();
  private readonly MAX_PROCESSED_IDS = 1000;

  private constructor() {
    // Simplified initialization without tab management
  }

  public static getInstance(): GlobalAttendanceLogger {
    if (!GlobalAttendanceLogger.instance) {
      GlobalAttendanceLogger.instance = new GlobalAttendanceLogger();
    }
    return GlobalAttendanceLogger.instance;
  }


  // Add callback for logging messages
  public addLogCallback(
    callback: (message: string, type: "success" | "error") => void
  ) {
    this.logCallbacks.push(callback);
  }

  // Remove callback
  public removeLogCallback(
    callback: (message: string, type: "success" | "error") => void
  ) {
    const index = this.logCallbacks.indexOf(callback);
    if (index > -1) {
      this.logCallbacks.splice(index, 1);
    }
  }

  // Add callback for attendance data
  public addAttendanceCallback(callback: (attendance: AttendanceData) => void) {
    this.attendanceCallbacks.push(callback);
  }

  // Remove attendance callback
  public removeAttendanceCallback(
    callback: (attendance: AttendanceData) => void
  ) {
    const index = this.attendanceCallbacks.indexOf(callback);
    if (index > -1) {
      this.attendanceCallbacks.splice(index, 1);
    }
  }

  private log(message: string, type: "success" | "error" = "success") {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] [GlobalAttendanceLogger] ${message}`;
    this.logCallbacks.forEach((callback) => callback(message, type));
  }

  // Convert via number to AccessMethod enum (updated mapping)
  private getAccessMethodFromVia(via: number): AccessMethod {
    switch (via) {
      case 1:
        return AccessMethod.Fingerprint;
      case 2:
        return AccessMethod.Face;
      case 3:
        return AccessMethod.Password;
      case 4:
        return AccessMethod.Card;
      case 5:
        return AccessMethod.BMS;
      case 6:
        return AccessMethod.Software;
      default:
        return AccessMethod.Software;
    }
  }

  // Main function to save attendance log to backend
  public async saveAttendanceLog(attendance: AttendanceData): Promise<boolean> {
    this.log(
      `🔄 Starting to save attendance log for user: ${attendance.data.name}`
    );

    try {
      const accessMethod = this.getAccessMethodFromVia(attendance.data.via);
      this.log(
        `🔧 Mapped via ${
          attendance.data.via
        } to AccessMethod: ${accessMethod} (${this.getAccessMethodName(
          accessMethod
        )})`
      );

      const logData = {
        user: attendance.data.name || "Unknown User",
        via: accessMethod as number,
        trigger: attendance.data.access_action,
        description: attendance.data.message,
        isSuccess: attendance.status === "success",
        additionalData: JSON.stringify({
          timestamp: attendance.data.timestamp,
          topic: "accessControl/attendance/live",
          deviceId: attendance.data.deviceId,
          device_name: attendance.data.device_name,
          uid: attendance.data.uid,
          verify_code: attendance.data.verify_code,
          punch_code: attendance.data.punch_code,
          event_type: attendance.event_type,
          via_method: this.getAccessMethodName(accessMethod),
          source: "global_mqtt_listener",
        }),
      };

      this.log(`📤 Sending to backend API...`);

      const result = await accessLogService.createAccessLog(logData);

      if (result.success) {
        return true;
      } else {
        throw new Error(result.message || "Failed to save attendance log");
      }
    } catch (error) {
      console.error("[DEBUG] GlobalAttendanceLogger error details:", error);
      return false;
    }
  }

  // Helper to get access method name (updated mapping)
  private getAccessMethodName(method: AccessMethod): string {
    switch (method) {
      case AccessMethod.Fingerprint:
        return "Fingerprint";
      case AccessMethod.Face:
        return "Face Recognition";
      case AccessMethod.Password:
        return "Password";
      case AccessMethod.Card:
        return "Card";
      case AccessMethod.BMS:
        return "BMS System";
      case AccessMethod.Software:
        return "Software";
      default:
        return "Unknown";
    }
  }

  // Logger is always enabled - no disable function

  // Parse and save attendance message from MQTT
  public async handleMqttMessage(
    topic: string,
    message: string
  ): Promise<boolean> {
    // Generate message ID for deduplication
    const messageId = this.generateMessageId(topic, message);
    if (this.processedMessageIds.has(messageId)) {
      this.log(`🔄 Duplicate message detected, skipping: ${messageId}`);
      return true; // Return true as it was already processed
    }

    // Add to processed set and manage size
    this.processedMessageIds.add(messageId);
    if (this.processedMessageIds.size > this.MAX_PROCESSED_IDS) {
      // Remove oldest entries (convert to array, slice, then back to Set)
      const entries = Array.from(this.processedMessageIds);
      this.processedMessageIds = new Set(
        entries.slice(-this.MAX_PROCESSED_IDS + 100)
      );
    }

    this.log(`📨 MQTT message received from topic '${topic}'`);

    try {
      const attendance: AttendanceData = JSON.parse(message);
      this.log(
        `📋 Parsed attendance data for user: ${attendance.data.name} via ${attendance.data.via}`
      );

      // Notify all attendance callbacks (for UI updates)
      this.attendanceCallbacks.forEach((callback) => {
        try {
          callback(attendance);
        } catch (err) {
          console.error("[DEBUG] Error in attendance callback:", err);
        }
      });

      const result = await this.saveAttendanceLog(attendance);
      this.log(`🎯 Save result: ${result ? "SUCCESS" : "FAILED"}`);
      return result;
    } catch (error) {
      this.log(
        `❌ Failed to parse MQTT message from topic '${topic}': ${error}`,
        "error"
      );
      return false;
    }
  }

  private generateMessageId(topic: string, message: string): string {
    // Simple hash-like function for message deduplication
    const content = `${topic}:${message}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Get current statistics (could be extended)
  public getStats() {
    return {
      isEnabled: true, // Always enabled
      callbackCount: this.logCallbacks.length,
      attendanceCallbackCount: this.attendanceCallbacks.length,
      processedMessagesCount: this.processedMessageIds.size,
    };
  }

  // Cleanup method for proper resource management
  public cleanup(): void {
    this.logCallbacks.length = 0;
    this.attendanceCallbacks.length = 0;
    this.processedMessageIds.clear();
  }
}

// Export singleton instance
export const globalAttendanceLogger = GlobalAttendanceLogger.getInstance();

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    globalAttendanceLogger.cleanup();
  });
}
