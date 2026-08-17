'use client';
import { useState, useEffect, use, type FormEvent } from 'react';
import Link from 'next/link';
import { type Service, type Panel } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Select, FormActions } from '@/components/ui/form';
import { Cpu, Plus, ChevronRight, Zap, Edit2, Trash2, ToggleLeft } from 'lucide-react';

function PanelNode({ panel, locationId, depth, onEdit, onDelete }: {
  panel: Panel; locationId: string; depth: number;
  onEdit: (p: Panel) => void; onDelete: (p: Panel) => void;
}) {
  const subpanels = (panel.panels || panel.children || []) as Panel[];
  return (
    <div className={depth > 0 ? 'ml-6 border-l border-border pl-4 mt-2' : ''}>
      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${panel.type === 'main' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
          <Cpu className={`w-4 h-4 ${panel.type === 'main' ? 'text-blue-500' : 'text-purple-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{panel.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              panel.type === 'main' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
            }`}>{panel.type}</span>
            {panel.amperage && <span className="text-xs text-muted-foreground">{panel.amperage}A</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ToggleLeft className="w-3 h-3" /> {panel.breakers_aggregate?.aggregate.count ?? 0} breakers
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/locations/${locationId}/panels/${panel.id}`}
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Open Panel
          </Link>
          <button onClick={() => onEdit(panel)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(panel)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {subpanels.map(child => (
        <PanelNode key={child.id} panel={child} locationId={locationId} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function PanelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [deletePanel, setDeletePanel] = useState<Panel | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'sub', amperage: '', parent_id: '', service_id: '', has_main_disconnect: true, slots: '20' });

  const loadServices = () => {
    fetch(`/api/locations/${id}/panels`)
      .then(r => r.json())
      .then(d => setServices(d.services || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadServices(); }, [id]);

  const allPanels = services.flatMap(s => {
    const flat = (panels: Panel[]): Panel[] => panels.flatMap(p => [p, ...(((p.panels || p.children) as Panel[]) ? flat((p.panels || p.children) as Panel[]) : [])]);
    return flat(s.panels || []);
  });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const serviceId = form.service_id || services[0]?.id;
      await fetch(`/api/locations/${id}/panels`, {
        method: editPanel ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'panel',
          id: editPanel?.id,
          service_id: serviceId,
          parent_id: form.parent_id || null,
          name: form.name,
          panel_type: form.type as 'main' | 'sub',
          amperage: form.amperage ? parseInt(form.amperage) : null,
          has_main_disconnect: form.has_main_disconnect,
          slots: form.slots ? parseInt(form.slots) : 20,
          voltage: 240,
          area_id: null,
          main_disconnect_label: 'MAIN',
          manufacturer: null, model: null, icon: 'cpu', description: null,
        }),
      });
      toast({ title: editPanel ? 'Panel updated' : 'Panel added', variant: 'success' });
      setShowAddPanel(false);
      setEditPanel(null);
      loadServices();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/locations/${id}`} className="hover:text-foreground transition-colors">← Location</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Panels</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Electrical Panels</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Services, main panels, and subpanels</p>
        </div>
        <button onClick={() => { setEditPanel(null); setForm({ name: '', type: 'sub', amperage: '', parent_id: allPanels[0]?.id || '', service_id: services[0]?.id || '', has_main_disconnect: false, slots: '20' }); setShowAddPanel(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Subpanel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {services.map(service => (
            <div key={service.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-semibold">{service.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {[service.amperage && `${service.amperage}A`, service.voltage && `${service.voltage}V`].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {(service.panels || []).filter(p => !p.parent_id).map(panel => (
                  <PanelNode key={panel.id} panel={panel} locationId={id} depth={0}
                    onEdit={p => { setEditPanel(p); setForm({ name: p.name, type: p.type, amperage: p.amperage?.toString() || '', parent_id: p.parent_id || '', service_id: service.id, has_main_disconnect: p.has_main_disconnect, slots: p.slots?.toString() || '20' }); setShowAddPanel(true); }}
                    onDelete={setDeletePanel} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddPanel} onClose={() => setShowAddPanel(false)} title={editPanel ? 'Edit Panel' : 'Add Subpanel'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Panel Name" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Garage Subpanel, Workshop Panel…" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amperage" optional>
              <Input type="number" value={form.amperage} onChange={e => setForm(f => ({ ...f, amperage: e.target.value }))} placeholder="100" />
            </Field>
            <Field label="Slots">
              <Input type="number" value={form.slots} onChange={e => setForm(f => ({ ...f, slots: e.target.value }))} placeholder="20" />
            </Field>
          </div>
          <Field label="Parent Panel" optional>
            <Select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
              <option value="">None</option>
              {allPanels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <FormActions loading={saving} onCancel={() => setShowAddPanel(false)} submitLabel={editPanel ? 'Save' : 'Add Panel'} />
        </form>
      </Dialog>

      <ConfirmDialog open={!!deletePanel} onClose={() => setDeletePanel(null)} onConfirm={async () => {
        await fetch(`/api/locations/${id}/panels`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ panel_id: deletePanel?.id }) });
        toast({ title: 'Panel deleted', variant: 'success' });
        setDeletePanel(null);
        loadServices();
      }} title="Delete Panel" description={`Delete "${deletePanel?.name}" and all its breakers?`} confirmLabel="Delete Panel" variant="destructive" />
    </div>
  );
}
