'use client';
import { useState, useEffect, use, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { type Asset, type AssetType, type Area } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Textarea, Select, FormActions } from '@/components/ui/form';
import { Plug, Plus, Edit2, Trash2, ChevronRight, Search, MapPin, ToggleLeft, Info } from 'lucide-react';

interface BreakerOption {
  id: string;
  label: string;
  amperage?: number;
  description?: string;
  is_spare: boolean;
  panel: { id: string; name: string };
}

interface AssetFormData {
  name: string; asset_type_id: string; asset_type_name: string;
  area_id: string; breaker_id: string; description: string;
  notes: string; manufacturer: string; model: string;
  serial_number: string; wattage: string; amperage: string; voltage: string;
}

const EMPTY_FORM: AssetFormData = {
  name: '', asset_type_id: '', asset_type_name: '', area_id: '', breaker_id: '',
  description: '', notes: '', manufacturer: '', model: '', serial_number: '',
  wattage: '', amperage: '', voltage: '',
};

function flattenAreas(list: Area[]): Area[] {
  return list.flatMap(a => [a, ...(a.areas ? flattenAreas(a.areas as Area[]) : [])]);
}

export default function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [breakers, setBreakers] = useState<BreakerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AssetFormData>(EMPTY_FORM);

  const loadData = useCallback(async () => {
    try {
      const [assetsRes, typesRes, areasRes, breakersRes] = await Promise.all([
        fetch(`/api/locations/${id}/assets`),
        fetch(`/api/locations/${id}/assets?types=true`),
        fetch(`/api/locations/${id}/areas`),
        fetch(`/api/locations/${id}/breakers`),
      ]);
      const [assetsData, typesData, areasData, breakersData] = await Promise.all([
        assetsRes.json(), typesRes.json(), areasRes.json(), breakersRes.json(),
      ]);
      setAssets(assetsData.assets || []);
      setAssetTypes(typesData.asset_types || []);
      setAreas(flattenAreas(areasData.areas || []));
      setBreakers(breakersData.breakers || []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = assets.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
      !(a.system_id || '').toLowerCase().includes(search.toLowerCase()) &&
      !(a.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterArea && a.area_id !== filterArea) return false;
    if (filterType && a.asset_type_id !== filterType) return false;
    return true;
  });

  const openAdd = () => { setEditAsset(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (asset: Asset) => {
    setEditAsset(asset);
    setForm({
      name: asset.name, asset_type_id: asset.asset_type_id || '',
      asset_type_name: asset.asset_type?.name || '',
      area_id: asset.area_id || '', breaker_id: asset.breaker_id || '',
      description: asset.description || '', notes: asset.notes || '',
      manufacturer: asset.manufacturer || '', model: asset.model || '',
      serial_number: asset.serial_number || '', wattage: asset.wattage?.toString() || '',
      amperage: asset.amperage?.toString() || '', voltage: asset.voltage?.toString() || '',
    });
    setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const typeName = assetTypes.find(t => t.id === form.asset_type_id)?.name || 'Device';
      const payload = {
        name: form.name, asset_type_id: form.asset_type_id || null,
        asset_type_name: typeName,
        area_id: form.area_id || null, breaker_id: form.breaker_id || null,
        description: form.description || null, notes: form.notes || null,
        manufacturer: form.manufacturer || null, model: form.model || null,
        serial_number: form.serial_number || null,
        wattage: form.wattage ? parseInt(form.wattage) : null,
        amperage: form.amperage ? parseFloat(form.amperage) : null,
        voltage: form.voltage ? parseInt(form.voltage) : null,
        icon: null, install_date: null,
      };
      if (editAsset) {
        const res = await fetch(`/api/locations/${id}/assets`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editAsset.id, ...payload }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        toast({ title: 'Asset updated', variant: 'success' });
      } else {
        const res = await fetch(`/api/locations/${id}/assets`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        toast({ title: 'Asset created', variant: 'success' });
      }
      setShowForm(false);
      loadData();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAsset) return;
    try {
      await fetch(`/api/locations/${id}/assets`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: deleteAsset.id }),
      });
      toast({ title: 'Asset deleted', variant: 'success' });
      setDeleteAsset(null);
      loadData();
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/locations/${id}`} className="hover:text-foreground transition-colors">← Location</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Assets</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Assets & Devices</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{assets.length} total devices</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, system ID…"
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Areas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.short_code} — {a.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Types</option>
          {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Plug className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">{assets.length === 0 ? 'No assets yet' : 'No matches'}</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            {assets.length === 0
              ? 'Add outlets, switches, appliances, and other electrical devices to track which breaker controls each one.'
              : 'Try adjusting your search or filters.'}
          </p>
          {assets.length === 0 && (
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Add First Asset
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {['Asset', 'System ID', 'Type', 'Area', 'Breaker', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(asset => (
                <tr key={asset.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Plug className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{asset.name}</p>
                        {asset.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{asset.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {asset.system_id
                      ? <span className="system-id">{asset.system_id}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{asset.asset_type?.name || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {asset.area
                      ? <span className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3 h-3 flex-shrink-0" />{asset.area.name}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {asset.breaker
                      ? <Link href={`/locations/${id}/panels/${asset.breaker.panel?.id}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1.5">
                          <ToggleLeft className="w-3 h-3" />
                          {asset.breaker.panel?.name} · #{asset.breaker.label}
                        </Link>
                      : <span className="text-muted-foreground text-xs">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => setViewAsset(asset)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(asset)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteAsset(asset)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Form */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editAsset ? 'Edit Asset' : 'Add Asset'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Kitchen GFCI Outlet, AC Unit, etc." required />
            </Field>
            <Field label="Device Type" optional>
              <Select value={form.asset_type_id} onChange={e => setForm(f => ({ ...f, asset_type_id: e.target.value }))}>
                <option value="">— Select type —</option>
                {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Area" optional>
              <Select value={form.area_id} onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}>
                <option value="">— No area —</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.short_code} — {a.name}</option>)}
              </Select>
            </Field>
            <Field label="Circuit Breaker" optional>
              <Select value={form.breaker_id} onChange={e => setForm(f => ({ ...f, breaker_id: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {breakers.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.panel?.name} · #{b.label}{b.amperage ? ` (${b.amperage}A)` : ''}{b.description ? ` — ${b.description}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description" optional>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this device" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Wattage" optional>
              <Input type="number" value={form.wattage} onChange={e => setForm(f => ({ ...f, wattage: e.target.value }))} placeholder="1500" />
            </Field>
            <Field label="Amperage" optional>
              <Input type="number" value={form.amperage} onChange={e => setForm(f => ({ ...f, amperage: e.target.value }))} placeholder="15" />
            </Field>
            <Field label="Voltage" optional>
              <Input type="number" value={form.voltage} onChange={e => setForm(f => ({ ...f, voltage: e.target.value }))} placeholder="120" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Manufacturer" optional>
              <Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} placeholder="Leviton, GE, etc." />
            </Field>
            <Field label="Model" optional>
              <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes" optional>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes…" />
          </Field>
          <FormActions loading={saving} onCancel={() => setShowForm(false)} submitLabel={editAsset ? 'Save Changes' : 'Add Asset'} />
        </form>
      </Dialog>

      {/* Asset Detail View */}
      {viewAsset && (
        <Dialog open onClose={() => setViewAsset(null)} title={viewAsset.name} size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {viewAsset.system_id && <span className="system-id text-sm">{viewAsset.system_id}</span>}
              {viewAsset.asset_type && <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-md">{viewAsset.asset_type.name}</span>}
            </div>
            {viewAsset.description && <p className="text-sm text-muted-foreground">{viewAsset.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              {([
                ['Area', viewAsset.area?.name],
                ['Breaker', viewAsset.breaker ? `${viewAsset.breaker.panel?.name} #${viewAsset.breaker.label}` : null],
                ['Wattage', viewAsset.wattage ? `${viewAsset.wattage}W` : null],
                ['Voltage', viewAsset.voltage ? `${viewAsset.voltage}V` : null],
                ['Amperage', viewAsset.amperage ? `${viewAsset.amperage}A` : null],
                ['Manufacturer', viewAsset.manufacturer],
                ['Model', viewAsset.model],
                ['Serial #', viewAsset.serial_number],
              ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="text-sm font-medium mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {viewAsset.notes && (
              <div className="bg-secondary/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{viewAsset.notes}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2 border-t border-border">
              <button onClick={() => { setViewAsset(null); openEdit(viewAsset); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Edit2 className="w-3.5 h-3.5" /> Edit Asset
              </button>
            </div>
          </div>
        </Dialog>
      )}

      <ConfirmDialog open={!!deleteAsset} onClose={() => setDeleteAsset(null)} onConfirm={handleDelete}
        title="Delete Asset" description={`Delete "${deleteAsset?.name}"? This cannot be undone.`}
        confirmLabel="Delete Asset" variant="destructive" />
    </div>
  );
}
