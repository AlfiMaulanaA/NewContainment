import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export function useSortableTable<T extends Record<string, any>>(data: T[]) {
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      // If clicking the same field, cycle through asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      // If clicking a new field, start with asc
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortField || !sortDirection) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        const comparison = aVal.getTime() - bVal.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Handle boolean values
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        if (aVal === bVal) return 0;
        const comparison = aVal ? 1 : -1;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Fallback to string comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? comparison : -comparison;
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