'use client';
import { OmniSearch } from '@/components/search/omni-search';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName } from '@/types';

export function AppHeader({ locationId }: { locationId?: string }) {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="flex-1">
        <OmniSearch locationId={locationId} />
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground hidden sm:block">
          {user && getDisplayName(user)}
        </div>
      </div>
    </header>
  );
}
