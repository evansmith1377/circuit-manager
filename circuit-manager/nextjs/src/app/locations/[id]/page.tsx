'use client';
import { useState, useEffect, use, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { type Location } from '@/types';
import { useToast } from '@/hooks/useToast';
import {
  MapPin, Cpu, Plug, Users, Settings, ChevronRight,
  Building2, Zap, Map, ArrowLeft, Edit2, Trash2, Share2
} from 'lucide-react';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Textarea, FormActions } from '@/components/ui/form';

export default function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', description: '' });

  useEffect(() => {
    fetch(`/api/locations/${id}`)
      .then(r => r.json())
      .then(d => {
        setLocation(d.locations_by_pk);
        setEditForm({ name: d.locations_by_pk?.name || '', address: d.locations_by_pk?.address || '', description: d.locations_by_pk?.description || '' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = location?.owner_id === user?.id;
  const access = location?.location_access?.[0];
  const canEdit = isOwner || access?.can_edit;
  const canManage = isOwner || access?.can_manage_access;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to save');
      setLocation(l => l ? { ...l, ...editForm } : l);
      setShowEdit(false);
      toast({ title: 'Location updated', variant: 'success' });
    } catch {
      toast({ title: 'Error saving changes', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      toast({ title: 'Location deleted', variant: 'success' });
      router.push('/dashboard');
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!location) return (
    <div className="empty-state">
      <p className="text-muted-foreground">Location not found or access denied.</p>
      <Link href="/dashboard" className="mt-4 text-primary hover:underline text-sm">← Back to Dashboard</Link>
    </div>
  );

  const cards = [
    {
      href: `/locations/${id}/panels`,
      icon: <Cpu className="w-6 h-6 text-blue-500" />,
      bg: 'bg-blue-500/10',
      title: 'Electrical Panels',
      description: 'Manage main panels, subpanels, and circuit breakers',
      stat: location.services?.reduce((s, sv) => s + (sv.panels_aggregate?.aggregate.count ?? 0), 0) ?? 0,
      statLabel: 'panels',
    },
    {
      href: `/locations/${id}/areas`,
      icon: <Map className="w-6 h-6 text-green-500" />,
      bg: 'bg-green-500/10',
      title: 'Areas',
      description: 'Structures, floors, rooms, and outdoor spaces',
      stat: location.areas_aggregate?.aggregate.count ?? 0,
      statLabel: 'areas',
    },
    {
      href: `/locations/${id}/assets`,
      icon: <Plug className="w-6 h-6 text-amber-500" />,
      bg: 'bg-amber-500/10',
      title: 'Assets & Devices',
      description: 'Outlets, switches, appliances, and other devices',
      stat: location.assets_aggregate?.aggregate.count ?? 0,
      statLabel: 'assets',
    },
    {
      href: `/locations/${id}/topology`,
      icon: <Share2 className="w-6 h-6 text-teal-500" />,
      bg: 'bg-teal-500/10',
      title: 'Topology Diagram',
      description: 'Interactive visual map of the electrical system',
      stat: null,
      statLabel: 'interactive',
    },
    ...(canManage ? [{
      href: `/locations/${id}/access`,
      icon: <Users className="w-6 h-6 text-purple-500" />,
      bg: 'bg-purple-500/10',
      title: 'Access Management',
      description: 'Share this location with other users',
      stat: location.location_access_aggregate?.aggregate.count ?? 0,
      statLabel: 'shared users',
    }] : []),
  ];

  return (
    <div>
      {/* Back + Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{location.name}</span>
      </div>

      <div className="page-header">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{location.name}</h1>
            {location.address && (
              <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> {location.address}
              </p>
            )}
            {location.description && <p className="text-sm text-muted-foreground mt-1">{location.description}</p>}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            {isOwner && (
              <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 hover:bg-destructive/5 text-destructive text-sm transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main service info */}
      {location.services && location.services.length > 0 && (
        <div className="mb-6 bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{location.services[0].name}</p>
            <p className="text-xs text-muted-foreground">
              {[location.services[0].amperage && `${location.services[0].amperage}A`, location.services[0].voltage && `${location.services[0].voltage}V`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Link href={`/locations/${id}/panels`} className="text-xs text-primary hover:underline">
            Manage panels →
          </Link>
        </div>
      )}

      {/* Nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(card => (
          <Link key={card.href} href={card.href}
            className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center`}>{card.icon}</div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="font-semibold mb-1">{card.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{card.description}</p>
            <p className="text-2xl font-bold">{card.stat} <span className="text-sm font-normal text-muted-foreground">{card.statLabel}</span></p>
          </Link>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Edit Location">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name" required>
            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
          </Field>
          <Field label="Address" optional>
            <Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
          </Field>
          <Field label="Description" optional>
            <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <FormActions loading={saving} onCancel={() => setShowEdit(false)} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Location"
        description={`Are you sure you want to delete "${location.name}"? This will permanently delete all areas, panels, breakers, and assets.`}
        confirmLabel="Delete Location"
        variant="destructive"
      />
    </div>
  );
}
