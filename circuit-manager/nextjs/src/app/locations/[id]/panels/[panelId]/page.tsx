'use client';
import { useState, useEffect, use, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { type Panel, type Breaker, type Asset } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Select, FormActions, Checkbox } from '@/components/ui/form';
import { ToggleLeft, Plus, Edit2, Trash2, ChevronRight, GripVertical, Plug, Download } from 'lucide-react';
import { ExportPanel } from '@/components/panels/export-panel';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BREAKER_TYPES = ['standard', 'gfci', 'afci', 'dual', 'tandem'];

interface BreakerFormData {
  label: string; amperage: string; poles: string; voltage: string;
  breaker_type: string; description: string; is_spare: boolean; is_vacant: boolean;
}

function BreakerCard({ breaker, isLeft, selected, onSelect, onEdit, onDelete, canEdit }: {
  breaker: Breaker; isLeft: boolean; selected: boolean;
  onSelect: () => void; onEdit: (b: Breaker) => void; onDelete: (b: Breaker) => void; canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: breaker.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const assetCount = breaker.assets?.length ?? 0;

  const stateClass = breaker.is_vacant
    ? 'breaker-vacant opacity-40'
    : breaker.is_spare
    ? 'breaker-spare'
    : 'breaker-on';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`breaker-slot rounded-lg p-2.5 cursor-pointer select-none transition-all ${stateClass} ${selected ? 'ring-2 ring-primary' : ''} ${isDragging ? 'opacity-50 z-50' : ''} ${breaker.poles === 2 ? 'row-span-2' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        {canEdit && (
          <button {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" onClick={e => e.stopPropagation()}>
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-white/80">{breaker.label}</span>
            {breaker.amperage && <span className="text-xs text-white/50">{breaker.amperage}A</span>}
            {breaker.poles === 2 && <span className="text-xs bg-blue-500/20 text-blue-300 px-1 rounded">2P</span>}
          </div>
          {breaker.is_vacant ? (
            <span className="text-xs text-white/30">vacant</span>
          ) : breaker.is_spare ? (
            <span className="text-xs text-white/40">spare</span>
          ) : (
            <p className="text-xs text-white/60 truncate leading-tight">{breaker.description || (assetCount > 0 ? `${assetCount} device${assetCount > 1 ? 's' : ''}` : 'No label')}</p>
          )}
        </div>
        {assetCount > 0 && !breaker.is_vacant && !breaker.is_spare && (
          <div className="flex-shrink-0 w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
            <Plug className="w-2.5 h-2.5 text-green-400" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PanelDetailPage({ params }: { params: Promise<{ id: string; panelId: string }> }) {
  const { id, panelId } = use(params);
  const { toast } = useToast();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [breakers, setBreakers] = useState<Breaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAddBreaker, setShowAddBreaker] = useState(false);
  const [editBreaker, setEditBreaker] = useState<Breaker | null>(null);
  const [deleteBreaker, setDeleteBreaker] = useState<Breaker | null>(null);
  const [showAssets, setShowAssets] = useState<Breaker | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BreakerFormData>({
    label: '', amperage: '', poles: '1', voltage: '',
    breaker_type: 'standard', description: '', is_spare: false, is_vacant: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPanel = useCallback(() => {
    fetch(`/api/locations/${id}/panels/${panelId}`)
      .then(r => r.json())
      .then(d => {
        const p = d.panels_by_pk;
        setPanel(p);
        const sorted = [...(p?.breakers || [])].sort((a: Breaker, b: Breaker) => (a.position ?? 999) - (b.position ?? 999));
        setBreakers(sorted);
      })
      .finally(() => setLoading(false));
  }, [id, panelId]);

  useEffect(() => { loadPanel(); }, [loadPanel]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = breakers.findIndex(b => b.id === active.id);
    const newIndex = breakers.findIndex(b => b.id === over.id);
    const reordered = arrayMove(breakers, oldIndex, newIndex);
    setBreakers(reordered);
    await fetch(`/api/locations/${id}/panels/${panelId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder_breakers',
        positions: reordered.map((b, i) => ({ id: b.id, position: i })),
      }),
    });
  };

  const handleSaveBreaker = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: form.label, amperage: form.amperage ? parseInt(form.amperage) : null,
        poles: parseInt(form.poles), voltage: form.voltage ? parseInt(form.voltage) : null,
        breaker_type: form.breaker_type, description: form.description || null,
        is_spare: form.is_spare, is_vacant: form.is_vacant, icon: null,
      };
      if (editBreaker) {
        await fetch(`/api/locations/${id}/panels/${panelId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editBreaker.id, ...payload }),
        });
        toast({ title: 'Breaker updated', variant: 'success' });
      } else {
        await fetch(`/api/locations/${id}/panels/${panelId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_breaker', position: breakers.length, ...payload }),
        });
        toast({ title: 'Breaker added', variant: 'success' });
      }
      setShowAddBreaker(false);
      setEditBreaker(null);
      loadPanel();
    } catch {
      toast({ title: 'Error saving breaker', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBreaker = async () => {
    if (!deleteBreaker) return;
    await fetch(`/api/locations/${id}/panels/${panelId}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breaker_id: deleteBreaker.id }),
    });
    toast({ title: 'Breaker removed', variant: 'success' });
    setDeleteBreaker(null);
    setSelected(null);
    loadPanel();
  };

  const openEdit = (b: Breaker) => {
    setEditBreaker(b);
    setForm({ label: b.label, amperage: b.amperage?.toString() || '', poles: b.poles.toString(), voltage: b.voltage?.toString() || '', breaker_type: b.breaker_type || 'standard', description: b.description || '', is_spare: b.is_spare, is_vacant: b.is_vacant });
    setShowAddBreaker(true);
  };

  const openAdd = () => {
    setEditBreaker(null);
    setForm({ label: '', amperage: '', poles: '1', voltage: '', breaker_type: 'standard', description: '', is_spare: false, is_vacant: false });
    setShowAddBreaker(true);
  };

  // Build two-column layout: odd positions on right, even on left (standard US panel)
  const leftBreakers = breakers.filter((_, i) => i % 2 === 1);
  const rightBreakers = breakers.filter((_, i) => i % 2 === 0);

  const selectedBreaker = breakers.find(b => b.id === selected);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!panel) return <div className="empty-state"><p className="text-muted-foreground">Panel not found.</p></div>;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/locations/${id}`} className="hover:text-foreground transition-colors">Location</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/locations/${id}/panels`} className="hover:text-foreground transition-colors">Panels</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{panel.name}</span>
      </div>

      <div className="page-header mb-4">
        <div>
          <h1 className="text-2xl font-bold">{panel.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {panel.type} panel · {panel.amperage && `${panel.amperage}A · `}{breakers.length} breakers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Breaker
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* PANEL DISPLAY */}
        <div className="flex-shrink-0">
          <div className="panel-display w-[360px] p-4">
            {/* Panel header */}
            <div className="text-center mb-4">
              <p className="text-white/80 text-xs font-semibold tracking-wider uppercase">{panel.name}</p>
              <p className="text-white/40 text-xs">{panel.manufacturer || ''} {panel.amperage && `${panel.amperage}A`}</p>
            </div>

            {/* Main disconnect */}
            {panel.has_main_disconnect && (
              <div className="mb-4 mx-4">
                <div className="bg-red-900/40 border border-red-500/30 rounded-lg p-3 text-center">
                  <p className="text-red-300 text-xs font-bold tracking-widest uppercase">{panel.main_disconnect_label || 'MAIN'}</p>
                  {panel.amperage && <p className="text-red-400/60 text-xs">{panel.amperage}A</p>}
                </div>
              </div>
            )}

            {/* Bus bars */}
            <div className="flex gap-1 mb-3 mx-4">
              <div className="flex-1 h-1.5 bg-gray-600 rounded" />
              <div className="w-3 h-1.5 bg-white/20 rounded" />
              <div className="w-3 h-1.5 bg-black/40 rounded" />
              <div className="w-3 h-1.5 bg-green-700/60 rounded" />
              <div className="flex-1 h-1.5 bg-gray-600 rounded" />
            </div>

            {/* Breakers two-column */}
            {breakers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/30 text-xs">No breakers added</p>
                <button onClick={openAdd} className="mt-2 text-xs text-primary/70 hover:text-primary">+ Add breaker</button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={breakers.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-2 gap-1 px-1">
                    {breakers.map((breaker, i) => {
                      // Odd index = left column, even = right column
                      // But we display them interleaved: right[0], left[0], right[1], left[1]...
                      return (
                        <BreakerCard key={breaker.id} breaker={breaker}
                          isLeft={i % 2 === 1}
                          selected={selected === breaker.id}
                          onSelect={() => setSelected(selected === breaker.id ? null : breaker.id)}
                          onEdit={openEdit} onDelete={setDeleteBreaker} canEdit={true} />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Ground/neutral bus */}
            <div className="flex gap-1 mt-3 mx-4">
              <div className="flex-1 h-1 bg-white/10 rounded" />
              <div className="flex-1 h-1 bg-green-800/60 rounded" />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex gap-3 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-600/60 border-l-2 border-green-500 inline-block" /> Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary border-l-2 border-gray-500 inline-block" /> Spare</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm border border-dashed border-gray-600 inline-block" /> Vacant</span>
          </div>
        </div>

        {/* DETAILS PANEL */}
        <div className="flex-1 min-w-0">
          {selectedBreaker ? (
            <div className="bg-card border border-border rounded-2xl p-5 animate-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-lg">Breaker {selectedBreaker.label}</h2>
                    {selectedBreaker.amperage && <span className="text-sm text-muted-foreground">{selectedBreaker.amperage}A</span>}
                    {selectedBreaker.poles === 2 && <span className="text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded px-1.5 py-0.5">Double Pole</span>}
                  </div>
                  {selectedBreaker.description && <p className="text-sm text-muted-foreground">{selectedBreaker.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(selectedBreaker)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteBreaker(selectedBreaker)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Properties */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ['Type', selectedBreaker.breaker_type || 'standard'],
                  ['Poles', selectedBreaker.poles.toString()],
                  ['Amperage', selectedBreaker.amperage ? `${selectedBreaker.amperage}A` : '—'],
                  ['Voltage', selectedBreaker.voltage ? `${selectedBreaker.voltage}V` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="text-sm font-medium mt-0.5 capitalize">{v}</p>
                  </div>
                ))}
              </div>

              {/* Connected assets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">Connected Devices</h3>
                  <Link href={`/locations/${id}/assets?breaker=${selectedBreaker.id}`}
                    className="text-xs text-primary hover:underline">View all →</Link>
                </div>
                {selectedBreaker.assets && selectedBreaker.assets.length > 0 ? (
                  <div className="space-y-2">
                    {selectedBreaker.assets.map(asset => (
                      <div key={asset.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                        <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center">
                          <Plug className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{asset.name}</span>
                            {asset.system_id && <span className="system-id">{asset.system_id}</span>}
                          </div>
                          {asset.area && <p className="text-xs text-muted-foreground">{asset.area.name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-border rounded-xl">
                    <Plug className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No devices assigned</p>
                    <Link href={`/locations/${id}/assets`} className="text-xs text-primary hover:underline mt-1 inline-block">
                      Assign from Assets →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
              <ToggleLeft className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a breaker to view details</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click any breaker on the panel to inspect it</p>
            </div>
          )}

          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Total Breakers', value: breakers.length },
              { label: 'Active', value: breakers.filter(b => !b.is_spare && !b.is_vacant).length },
              { label: 'Spare / Vacant', value: breakers.filter(b => b.is_spare || b.is_vacant).length },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Breaker Dialog */}
      <Dialog open={showAddBreaker} onClose={() => { setShowAddBreaker(false); setEditBreaker(null); }} title={editBreaker ? 'Edit Breaker' : 'Add Breaker'}>
        <form onSubmit={handleSaveBreaker} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Breaker ID" required>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="1, 2, 3A, 3B…" required />
            </Field>
            <Field label="Amperage" optional>
              <Input type="number" value={form.amperage} onChange={e => setForm(f => ({ ...f, amperage: e.target.value }))} placeholder="20" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Poles">
              <Select value={form.poles} onChange={e => setForm(f => ({ ...f, poles: e.target.value }))}>
                <option value="1">Single Pole (1P)</option>
                <option value="2">Double Pole (2P)</option>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.breaker_type} onChange={e => setForm(f => ({ ...f, breaker_type: e.target.value }))}>
                {BREAKER_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description / Circuit Label" optional>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kitchen Outlets, Master Bedroom Lights…" />
          </Field>
          <div className="flex gap-4">
            <Checkbox label="Spare" checked={form.is_spare} onChange={v => setForm(f => ({ ...f, is_spare: v, is_vacant: v ? false : f.is_vacant }))} />
            <Checkbox label="Vacant slot" checked={form.is_vacant} onChange={v => setForm(f => ({ ...f, is_vacant: v, is_spare: v ? false : f.is_spare }))} />
          </div>
          <FormActions loading={saving} onCancel={() => { setShowAddBreaker(false); setEditBreaker(null); }} submitLabel={editBreaker ? 'Save' : 'Add Breaker'} />
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteBreaker} onClose={() => setDeleteBreaker(null)} onConfirm={handleDeleteBreaker}
        title="Remove Breaker" description={`Remove breaker "${deleteBreaker?.label}"? Assets will be unlinked.`}
        confirmLabel="Remove" variant="destructive" />

      {/* Export Dialog */}
      {showExport && panel && (
        <ExportPanel panel={panel} breakers={breakers} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
