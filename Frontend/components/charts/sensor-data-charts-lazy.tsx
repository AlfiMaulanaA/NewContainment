// components/charts/sensor-data-charts-lazy.tsx
import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

interface LazySensorDataChartsProps {
  containmentId?: number;
  deviceId?: number;
  className?: string;
}

// Lazy load the heavy charts component
const SensorDataCharts = lazy(() => import('./sensor-data-charts').then(module => ({ default: module.SensorDataCharts })));

export function LazySensorDataCharts(props: LazySensorDataChartsProps) {
  return (
    <Suspense
      fallback={
        <Card className={props.className}>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground">Loading Charts</p>
                <p className="text-sm text-muted-foreground">Initializing chart components...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    >
      <SensorDataCharts {...props} />
    </Suspense>
  );
}

export default LazySensorDataCharts;
