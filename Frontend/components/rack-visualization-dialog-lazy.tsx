// components/rack-visualization-dialog-lazy.tsx
import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { Rack } from '@/lib/api-service';

interface LazyRackVisualizationDialogProps {
  rack: Rack;
  trigger?: React.ReactNode;
}

// Lazy load the heavy rack visualization component
const RackVisualizationDialog = lazy(() => import('./rack-visualization-dialog'));

export function LazyRackVisualizationDialog(props: LazyRackVisualizationDialogProps) {
  return (
    <Suspense
      fallback={
        <Card className="max-w-6xl h-[90vh] flex flex-col">
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground">Loading Rack Visualization</p>
                <p className="text-sm text-muted-foreground">Initializing 3D visualization...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    >
      <RackVisualizationDialog {...props} />
    </Suspense>
  );
}

export default LazyRackVisualizationDialog;
