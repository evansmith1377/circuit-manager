'use client';
import { useState, useEffect, use, useCallback, type ReactNode, type FormEvent } from 'react';
import Link from 'next/link';
import { type Area, type AreaType, AREA_TYPE_LABELS } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Textarea, Select, FormActions } from '@/components/ui/form';
import {
  ChevronRight, ChevronDown, Plus, Edit2, Trash2,
  Home, Layers, TreePine, DoorOpen, Box, MapPin, Plug
} from 'lucide-react';

const TYPE_ICONS: Record<AreaType, ReactNode> = {
  structure: <Home className="w-3.5 h-3.5" />,
  floor: <Layers className="w-3.5 h-3.5" />,
  outdoors: <TreePine className="w-3.5 h-3.5" />,
  indoors: <DoorOpen className="w-3.5 h-3.5" />,
  other: <Box className="w-3.5 h-3.5" />,
};

const TYPE_COLORS: Record<AreaType, string> = {
  structure: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  floor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  outdoors: 'bg-green-500/10 text-green-600 border-green-500/20',
  indoors: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  other: 'bg-secondary text-muted-foreground border-border',
};

interface AreaNodeProps {
  area: Area;
  depth: number;
  locationId: string;
  canEdit: boolean;
  allAreas: Area[];
  onEdit: (area: Area) => void;
  onDelete: (area: Area) => void;
  onAddChild: (parentId: string) => void;
}

function AreaNode({ area, depth, locationId, canEdit, allAreas, onEdit, onDelete, onAddChild }: AreaNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = area.areas && (area.areas as Area[]).length > 0;
  const assetCount = area.assets_aggregate?.aggregate.count ?? 0;

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-border' : ''}`}>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-secondary/50 group transition-colors ${depth > 0 ? 'ml-2' : ''}`}>
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all ${!hasChildren ? 'invisible' : ''}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Icon + name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{area.name}</span>
              <span className="font-mono text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded px-1.5">{area.short_code}</span>
              {area.types.map(t => (
                <span key={t} className={`area-badge border ${TYPE_COLORS[t]} flex items-center gap-1`}>
                  {TYPE_ICONS[t]} {AREA_TYPE_LABELS[t]}
                </span>
              ))}
            </div>
            {area.description && <p className="text-xs text-muted-foreground truncate">{area.description}</p>}
          </div>
        </div>

        {/* Asset count */}
        {assetCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Plug className="w-3 h-3" />
            <span>{assetCount}</span>
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onAddChild(area.id)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="Add child area">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEdit(area)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(area)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {(area.areas as Area[] || []).map(child => (
            <AreaNode key={child.id} area={child} depth={depth + 1} locationId={locationId}
              canEdit={canEdit} allAreas={allAreas} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
}

const ALL_TYPES: AreaType[] = ['structure', 'floor', 'indoors', 'outdoors', 'other'];

interface AreaFormData {
  name: string;
  types: AreaType[];
  description: string;
  parent_id: string;
}

export default function AreasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [deleteArea, setDeleteArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState('');
  const [form, setForm] = useState<AreaFormData>({ name: '', types: ['indoors'], description: '', parent_id: '' });

  const loadAreas = useCallback(() => {
    fetch(`/api/locations/${id}/areas`)
      .then(r => r.json())
      .then(d => setAreas(d.areas || []))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadAreas();
    fetch(`/api/locations/${id}`)
      .then(r => r.json())
      .then(d => {
        const loc = d.locations_by_pk;
        if (!loc) return;
        const access = loc.location_access?.[0];
        setCanEdit(access?.can_edit || loc.owner_id != null);
      });
  }, [id, loadAreas]);

  const flatAreas = (areas: Area[]): Area[] => {
    return areas.flatMap(a => [a, ...(a.areas ? flatAreas(a.areas as Area[]) : [])]);
  };
  const allFlat = flatAreas(areas);

  const openAdd = (parentId = '') => {
    setDefaultParentId(parentId);
    setEditArea(null);
    setForm({ name: '', types: ['indoors'], description: '', parent_id: parentId });
    setShowForm(true);
  };

  const openEdit = (area: Area) => {
    setEditArea(area);
    setForm({ name: area.name, types: area.types, description: area.description || '', parent_id: area.parent_id || '' });
    setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editArea) {
        const res = await fetch(`/api/locations/${id}/areas`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editArea.id, ...form, parent_id: form.parent_id || null }),
        });
        if (!res.ok) throw new Error('Failed');
        toast({ title: 'Area updated', variant: 'success' });
      } else {
        const res = await fetch(`/api/locations/${id}/areas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, parent_id: form.parent_id || null }),
        });
        if (!res.ok) throw new Error('Failed');
        toast({ title: 'Area created', variant: 'success' });
      }
      setShowForm(false);
      loadAreas();
    } catch {
      toast({ title: 'Error saving area', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteArea) return;
    try {
      await fetch(`/api/locations/${id}/areas`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area_id: deleteArea.id }),
      });
      toast({ title: 'Area deleted', variant: 'success' });
      setDeleteArea(null);
      loadAreas();
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const toggleType = (t: AreaType) => {
    setForm(f => ({
      ...f,
      types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t],
    }));
  };

  // Top-level (no parent) areas
  const rootAreas = areas.filter(a => !a.parent_id);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/locations/${id}`} className="hover:text-foreground transition-colors">← Location</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Areas</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Areas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Structures, floors, rooms, and spaces</p>
        </div>
        {canEdit && (
          <button onClick={() => openAdd()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Area
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : areas.length === 0 ? (
        <div className="empty-state">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No areas yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Add structures (house, barn), floors (1st floor, basement), and rooms (kitchen, bedroom) to organize your assets.
          </p>
          {canEdit && (
            <button onClick={() => openAdd()} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Add First Area
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4">
          {rootAreas.map(area => (
            <AreaNode key={area.id} area={area} depth={0} locationId={id}
              canEdit={canEdit} allAreas={allFlat}
              onEdit={openEdit} onDelete={setDeleteArea} onAddChild={openAdd} />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editArea ? 'Edit Area' : 'Add Area'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Living Room, 1st Floor, etc." required />
          </Field>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Types <span className="text-destructive">*</span></label>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map(t => (
                <button key={t} type="button" onClick={() => toggleType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    form.types.includes(t)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {TYPE_ICONS[t]} {AREA_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            {form.types.length === 0 && <p className="text-xs text-destructive">Select at least one type</p>}
          </div>

          <Field label="Parent Area" optional>
            <Select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
              <option value="">None (top-level)</option>
              {allFlat.filter(a => a.id !== editArea?.id).map(a => (
                <option key={a.id} value={a.id}>{a.short_code} — {a.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Description" optional>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes about this area..." />
          </Field>

          <FormActions loading={saving} onCancel={() => setShowForm(false)} submitLabel={editArea ? 'Save Changes' : 'Create Area'} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteArea}
        onClose={() => setDeleteArea(null)}
        onConfirm={handleDelete}
        title="Delete Area"
        description={`Delete "${deleteArea?.name}"? Child areas will become top-level, and assets will be unassigned.`}
        confirmLabel="Delete Area"
        variant="destructive"
      />
    </div>
  );
}
