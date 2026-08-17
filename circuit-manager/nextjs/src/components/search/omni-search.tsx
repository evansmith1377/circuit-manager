'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Search, Plug, ToggleLeft, Cpu, MapPin, X, Zap } from 'lucide-react';

interface SearchResult {
  assets?: Array<{ id: string; name: string; system_id?: string; description?: string; asset_type?: { name: string; icon: string }; area?: { name: string }; breaker?: { label: string; panel?: { name: string } }; location?: { id: string; name: string } }>;
  breakers?: Array<{ id: string; label: string; description?: string; amperage?: number; panel?: { id: string; name: string; service?: { location?: { id: string; name: string } } }; assets?: Array<{ name: string; system_id?: string }> }>;
  areas?: Array<{ id: string; name: string; types: string[]; description?: string; assets_aggregate?: { aggregate: { count: number } } }>;
  panels?: Array<{ id: string; name: string; type: string; amperage?: number; description?: string }>;
}

export function OmniSearch({ locationId }: { locationId?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();

  const effectiveLocationId = locationId || (params?.id as string);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 1) { setResults(null); return; }
    setLoading(true);
    try {
      const url = `/api/search?q=${encodeURIComponent(q)}${effectiveLocationId ? `&location_id=${effectiveLocationId}` : ''}`;
      const res = await fetch(url);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, [effectiveLocationId]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const hasResults = results && (
    (results.assets?.length || 0) +
    (results.breakers?.length || 0) +
    (results.areas?.length || 0) +
    (results.panels?.length || 0)
  ) > 0;

  const navigateTo = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search breakers, assets, areas… (⌘K)"
          className="w-full pl-9 pr-10 py-2 bg-secondary/60 border border-transparent hover:border-border focus:border-ring focus:bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto animate-in">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && !hasResults && query.length > 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}

          {!loading && results && (
            <div className="py-1">
              {/* Assets */}
              {(results.assets?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Devices & Assets</div>
                  {results.assets!.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => navigateTo(`/locations/${asset.location?.id || effectiveLocationId}/assets?highlight=${asset.id}`)}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary flex items-start gap-3 transition-colors"
                    >
                      <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Plug className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{asset.name}</span>
                          {asset.system_id && <span className="system-id text-xs">{asset.system_id}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[asset.asset_type?.name, asset.area?.name, asset.breaker ? `Breaker ${asset.breaker.label}` : null].filter(Boolean).join(' · ')}
                          {asset.location && <span className="text-primary/70"> · {asset.location.name}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Breakers */}
              {(results.breakers?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Breakers</div>
                  {results.breakers!.map(breaker => (
                    <button
                      key={breaker.id}
                      onClick={() => {
                        const locId = breaker.panel?.service?.location?.id || effectiveLocationId;
                        navigateTo(`/locations/${locId}/panels/${breaker.panel?.id}?breaker=${breaker.id}`);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary flex items-start gap-3 transition-colors"
                    >
                      <div className="w-7 h-7 bg-amber-500/10 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0">
                        <ToggleLeft className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Breaker {breaker.label}</span>
                          {breaker.amperage && <span className="text-xs text-muted-foreground">{breaker.amperage}A</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {breaker.panel?.name}
                          {breaker.assets?.length ? ` · ${breaker.assets.length} device${breaker.assets.length > 1 ? 's' : ''}` : ''}
                          {breaker.description && ` · ${breaker.description}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Areas */}
              {(results.areas?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Areas</div>
                  {results.areas!.map(area => (
                    <button
                      key={area.id}
                      onClick={() => navigateTo(`/locations/${effectiveLocationId}/areas?highlight=${area.id}`)}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary flex items-start gap-3 transition-colors"
                    >
                      <div className="w-7 h-7 bg-green-500/10 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{area.name}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {area.types.join(', ')} · {area.assets_aggregate?.aggregate.count || 0} devices
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Panels */}
              {(results.panels?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Panels</div>
                  {results.panels!.map(panel => (
                    <button
                      key={panel.id}
                      onClick={() => navigateTo(`/locations/${effectiveLocationId}/panels/${panel.id}`)}
                      className="w-full text-left px-3 py-2.5 hover:bg-secondary flex items-start gap-3 transition-colors"
                    >
                      <div className="w-7 h-7 bg-blue-500/10 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Cpu className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{panel.name}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {panel.type} panel{panel.amperage ? ` · ${panel.amperage}A` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
