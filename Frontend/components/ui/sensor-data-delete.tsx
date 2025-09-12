"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2, AlertTriangle, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { deviceSensorDataApi } from "@/lib/api-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SensorDataDeleteProps {
  onDeleteComplete?: () => void;
  className?: string;
}

type DeleteMode = "all" | "dateRange" | "olderThan";

export function SensorDataDelete({ onDeleteComplete, className }: SensorDataDeleteProps) {
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("dateRange");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [olderThanDays, setOlderThanDays] = useState<number>(30);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await deviceSensorDataApi.deleteAllSensorData();
      
      if (response.success && response.data) {
        toast.success(`Successfully deleted all ${response.data.deletedCount} sensor data records`);
        onDeleteComplete?.();
      } else {
        toast.error(response.message || "Failed to delete sensor data");
      }
    } catch (error) {
      console.error("Delete all failed:", error);
      toast.error("Failed to delete sensor data");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteByDateRange = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (startDate >= endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deviceSensorDataApi.deleteSensorDataByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      if (response.success && response.data) {
        toast.success(
          `Successfully deleted ${response.data.deletedCount} records from ${format(startDate, "MMM dd, yyyy")} to ${format(endDate, "MMM dd, yyyy")}`
        );
        onDeleteComplete?.();
      } else {
        toast.error(response.message || "Failed to delete sensor data");
      }
    } catch (error) {
      console.error("Delete by date range failed:", error);
      toast.error("Failed to delete sensor data");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOlderThan = async () => {
    if (olderThanDays <= 0) {
      toast.error("Days must be greater than 0");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deviceSensorDataApi.deleteOldSensorData(olderThanDays);
      
      if (response.success && response.data) {
        toast.success(
          `Successfully deleted ${response.data.deletedCount} records older than ${olderThanDays} days`
        );
        onDeleteComplete?.();
      } else {
        toast.error(response.message || "Failed to delete sensor data");
      }
    } catch (error) {
      console.error("Delete older than failed:", error);
      toast.error("Failed to delete sensor data");
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeleteAction = () => {
    switch (deleteMode) {
      case "all":
        return handleDeleteAll;
      case "dateRange":
        return handleDeleteByDateRange;
      case "olderThan":
        return handleDeleteOlderThan;
      default:
        return () => {};
    }
  };

  const getDeleteDescription = () => {
    switch (deleteMode) {
      case "all":
        return "This will permanently delete ALL sensor data records from the database. This action cannot be undone.";
      case "dateRange":
        return startDate && endDate 
          ? `This will permanently delete all sensor data records between ${format(startDate, "MMM dd, yyyy")} and ${format(endDate, "MMM dd, yyyy")}. This action cannot be undone.`
          : "This will permanently delete sensor data records within the selected date range. This action cannot be undone.";
      case "olderThan":
        return `This will permanently delete all sensor data records older than ${olderThanDays} days. This action cannot be undone.`;
      default:
        return "";
    }
  };

  const isDeleteDisabled = () => {
    switch (deleteMode) {
      case "all":
        return isDeleting;
      case "dateRange":
        return isDeleting || !startDate || !endDate || startDate >= endDate;
      case "olderThan":
        return isDeleting || olderThanDays <= 0;
      default:
        return true;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Sensor Data
        </CardTitle>
        <CardDescription>
          Permanently remove sensor data logs from the database. Use with caution as this action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delete Mode Selection */}
        <div className="space-y-2">
          <Label htmlFor="delete-mode">Delete Mode</Label>
          <Select value={deleteMode} onValueChange={(value: DeleteMode) => setDeleteMode(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select delete mode..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateRange">Delete by Date Range</SelectItem>
              <SelectItem value="olderThan">Delete Older Than</SelectItem>
              <SelectItem value="all">Delete All Records</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Selection */}
        {deleteMode === "dateRange" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setIsStartCalendarOpen(false);
                      }}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setIsEndCalendarOpen(false);
                      }}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {startDate && endDate && startDate >= endDate && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">Start date must be before end date</span>
              </div>
            )}
          </div>
        )}

        {/* Older Than Selection */}
        {deleteMode === "olderThan" && (
          <div className="space-y-2">
            <Label htmlFor="older-than-days">Delete records older than (days)</Label>
            <Input
              id="older-than-days"
              type="number"
              min="1"
              max="3650"
              value={olderThanDays}
              onChange={(e) => setOlderThanDays(parseInt(e.target.value) || 30)}
              placeholder="Enter number of days..."
            />
            <p className="text-xs text-muted-foreground">
              This will delete all sensor data records older than {olderThanDays} days from today
            </p>
          </div>
        )}

        {/* Delete All Warning */}
        {deleteMode === "all" && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Critical Action: Delete All Data
              </p>
              <p className="text-xs text-destructive/80">
                This will permanently remove ALL sensor data from the database. This action is irreversible and will affect all devices, all sensor types, and all time periods.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              {deleteMode === "all" ? "All Records" : 
               deleteMode === "dateRange" ? "Date Range" : 
               `Older than ${olderThanDays} days`}
            </Badge>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isDeleteDisabled()}
                className="min-w-[120px]"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Data
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirm Data Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>{getDeleteDescription()}</p>
                  <p className="font-medium text-foreground">
                    Are you sure you want to proceed?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={getDeleteAction()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Information */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• Deleted data cannot be recovered</p>
          <p>• This action will be logged for audit purposes</p>
          <p>• Consider exporting data before deletion if needed</p>
          <p>• Only administrators can perform this action</p>
        </div>
      </CardContent>
    </Card>
  );
}