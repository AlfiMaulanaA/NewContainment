// hooks/use-sort-table.tsx
import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

type SortableValue = string | number | boolean | Date | null | undefined;

// Perbarui tipe data `data` agar bisa menerima null atau undefined
export function useSortableTable<T extends Record<string, any>>(
  data: T[] | null | undefined
) {
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sorted = useMemo(() => {
    // Pastikan `data` adalah array yang valid sebelum diurutkan
    const safeData = Array.isArray(data) ? data : [];

    if (!sortField || !sortDirection) {
      return safeData;
    }

    return [...safeData].sort((a, b) => {
      const aVal: SortableValue = a[sortField];
      const bVal: SortableValue = b[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? 1 : -1;
      if (bVal == null) return sortDirection === "asc" ? -1 : 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === "asc" ? comparison : -comparison;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const isADate =
        typeof aVal === "string" && !isNaN(new Date(aVal).getTime());
      const isBDate =
        typeof bVal === "string" && !isNaN(new Date(bVal).getTime());

      if (isADate && isBDate) {
        const dateA = new Date(aVal as string).getTime();
        const dateB = new Date(bVal as string).getTime();
        const comparison = dateA - dateB;
        return sortDirection === "asc" ? comparison : -comparison;
      }

      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        if (aVal === bVal) return 0;
        const comparison = aVal ? 1 : -1;
        return sortDirection === "asc" ? comparison : -comparison;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  return {
    sorted,
    sortField,
    sortDirection,
    handleSort,
    setSortField,
    setSortDirection,
  };
}
