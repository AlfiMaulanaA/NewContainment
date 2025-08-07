import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RoutePreloaderOptions {
  routes: string[];
  preloadDelay?: number;
}

export function useRoutePreloader({ routes, preloadDelay = 3000 }: RoutePreloaderOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!routes || routes.length === 0) return;
    
    const timer = setTimeout(() => {
      routes.forEach((route) => {
        try {
          if (typeof route === 'string' && route.startsWith('/')) {
            router.prefetch(route);
          }
        } catch (error) {
          // Silently ignore errors
        }
      });
    }, preloadDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [router, routes, preloadDelay]);
}