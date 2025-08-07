import { useState, useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface UseApiCacheOptions {
  cacheTime?: number; // Cache duration in milliseconds (default: 5 minutes)
}

export function useApiCache<T>(options: UseApiCacheOptions = {}) {
  const { cacheTime = 5 * 60 * 1000 } = options; // 5 minutes default
  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());

  const getCachedData = useCallback((key: string): T | null => {
    const cached = cacheRef.current.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.timestamp + cached.expiry) {
      // Cache expired, remove it
      cacheRef.current.delete(key);
      return null;
    }
    
    return cached.data;
  }, []);

  const setCachedData = useCallback((key: string, data: T) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      expiry: cacheTime,
    });
  }, [cacheTime]);

  const fetchWithCache = useCallback(
    async (
      key: string, 
      fetchFunction: () => Promise<T>, 
      forceRefresh: boolean = false
    ): Promise<T> => {
      // Check if already loading this key
      if (loading.get(key)) {
        // Return cached data while loading, or wait
        const cached = getCachedData(key);
        if (cached) return cached;
        
        // Wait for current request to complete
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!loading.get(key)) {
              clearInterval(checkInterval);
              const result = getCachedData(key);
              if (result) {
                resolve(result);
              }
            }
          }, 50);
        });
      }

      // Check cache first
      if (!forceRefresh) {
        const cached = getCachedData(key);
        if (cached) {
          return cached;
        }
      }

      // Set loading state
      setLoading(prev => new Map(prev).set(key, true));

      try {
        const data = await fetchFunction();
        setCachedData(key, data);
        return data;
      } finally {
        // Clear loading state
        setLoading(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      }
    },
    [getCachedData, setCachedData, loading]
  );

  const isLoading = useCallback((key: string) => {
    return loading.get(key) || false;
  }, [loading]);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  const preload = useCallback(
    async (key: string, fetchFunction: () => Promise<T>) => {
      const cached = getCachedData(key);
      if (!cached && !loading.get(key)) {
        // Preload in background without blocking UI
        fetchWithCache(key, fetchFunction).catch(console.error);
      }
    },
    [getCachedData, fetchWithCache, loading]
  );

  return {
    fetchWithCache,
    isLoading,
    clearCache,
    preload,
    getCachedData,
  };
}