'use client';
import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName, type Location } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea, FormActions } from '@/components/ui/form';
import {
  Building2, Plus, MapPin, Plug, Cpu, ChevronRight,
  Home, Warehouse, Users, Zap
} from 'lucide-react';

function LocationCard({ loc, isOwner }: { loc: Location; isOwner: boolean }) {
  const access = loc.location_access?.[0];
  const canEdit = isOwner || access?.can_edit;

  return (
    <Link
      href={`/locations/${loc.id}`}
      className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex items-center gap-1.5">
          {isOwner && (
            <span className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full px-2 py-0.5 font-medium">Owner</span>
          )}
          {!isOwner && access?.can_edit && (
            <span className="text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full px-2 py-0.5 font-medium">Editor</span>
          )}
          {!isOwner && !access?.can_edit && (
            <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5 font-medium">Viewer</span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      <h3 className="font-semibold text-base mb-1">{loc.name}</h3>
      {loc.address && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{loc.address}</span>
        </p>
      )}

      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Plug className="w-3.5 h-3.5" />
          <span>{loc.assets_aggregate?.aggregate.count ?? 0} assets</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>{loc.areas_aggregate?.aggregate.count ?? 0} areas</span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', description: '' });

  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(d => setLocations(d.locations || []))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setLocations(l => [...l, data.location]);
      setShowCreate(false);
      setForm({ name: '', address: '', description: '' });
      toast({ title: 'Location created', variant: 'success' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const ownedLocations = locations.filter(l => l.owner_id === user?.id);
  const sharedLocations = locations.filter(l => l.owner_id !== user?.id);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Welcome back, {user ? getDisplayName(user) : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Location
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Locations', value: locations.length, icon: <Building2 className="w-5 h-5" />, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Owned', value: ownedLocations.length, icon: <Home className="w-5 h-5" />, color: 'text-green-500 bg-green-500/10' },
          { label: 'Shared', value: sharedLocations.length, icon: <Users className="w-5 h-5" />, color: 'text-purple-500 bg-purple-500/10' },
          { label: 'Assets', value: locations.reduce((s, l) => s + (l.assets_aggregate?.aggregate.count ?? 0), 0), icon: <Plug className="w-5 h-5" />, color: 'text-amber-500 bg-amber-500/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : locations.length === 0 ? (
        <div className="empty-state">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No locations yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Create your first location to start documenting electrical circuits for your home or business.
          </p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Create Location
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {ownedLocations.length > 0 && (
            <div>
              <h2 className="section-title mb-4">My Locations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ownedLocations.map(loc => <LocationCard key={loc.id} loc={loc} isOwner={true} />)}
              </div>
            </div>
          )}
          {sharedLocations.length > 0 && (
            <div>
              <h2 className="section-title mb-4">Shared With Me</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sharedLocations.map(loc => <LocationCard key={loc.id} loc={loc} isOwner={false} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="New Location" description="Create a new location to manage its electrical circuits.">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Location Name" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My House, Office Building, etc." required />
          </Field>
          <Field label="Address" optional>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, State" />
          </Field>
          <Field label="Description" optional>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes about this location..." />
          </Field>
          <FormActions loading={creating} onCancel={() => setShowCreate(false)} submitLabel="Create Location" />
        </form>
      </Dialog>
    </div>
  );
}
