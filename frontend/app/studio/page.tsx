import { Suspense } from 'react';
import StudioMain from '@/components/studio/StudioMain';
import { Loader2 } from 'lucide-react';

export const dynamic = "force-dynamic";

export default function StudioPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    }>
        <StudioMain />
    </Suspense>
  );
}
