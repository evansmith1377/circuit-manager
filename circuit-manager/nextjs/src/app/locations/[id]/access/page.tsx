'use client';
import { useState, useEffect, use, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { type LocationAccess } from '@/types';
import { getDisplayName } from '@/types';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Field, Input, Checkbox, FormActions } from '@/components/ui/form';
import { Users, Plus, Trash2, Crown, ChevronRight, Shield, Edit2 } from 'lucide-react';

interface AccessEntry extends LocationAccess {
  user: { id: string; first_name: string; last_name: string; display_name: string; email: string };
}

export default function AccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const [accessList, setAccessList] = useState<AccessEntry[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [removeEntry, setRemoveEntry] = useState<AccessEntry | null>(null);
  const [editEntry, setEditEntry] = useState<AccessEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', can_edit: false, can_manage_access: false });
  const [transferEmail, setTransferEmail] = useState('');

  const loadAccess = async () => {
    const [accessRes, locRes] = await Promise.all([
      fetch(`/api/locations/${id}/access`),
      fetch(`/api/locations/${id}`),
    ]);
    const [accessData, locData] = await Promise.all([accessRes.json(), locRes.json()]);
    setAccessList(accessData.location_access || []);
    setOwnerId(locData.locations_by_pk?.owner_id || '');
    setLoading(false);
  };

  useEffect(() => { loadAccess(); }, [id]);

  const isOwner = ownerId === user?.id;

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inviteForm, can_view: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Access granted', variant: 'success' });
      setShowInvite(false);
      setInviteForm({ email: '', can_edit: false, can_manage_access: false });
      loadAccess();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermissions = async (entry: AccessEntry, changes: Partial<AccessEntry>) => {
    const updated = { ...entry, ...changes };
    await fetch(`/api/locations/${id}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: updated.user.email,
        can_view: updated.can_view,
        can_edit: updated.can_edit,
        can_manage_access: updated.can_manage_access,
      }),
    });
    loadAccess();
  };

  const handleRemove = async () => {
    if (!removeEntry) return;
    await fetch(`/api/locations/${id}/access`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: removeEntry.user_id }),
    });
    toast({ title: 'Access removed', variant: 'success' });
    setRemoveEntry(null);
    loadAccess();
  };

  const handleTransfer = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: transferEmail }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Ownership transferred', variant: 'success' });
      setShowTransfer(false);
      loadAccess();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const permBadge = (entry: AccessEntry) => {
    const perms = [];
    if (entry.can_view) perms.push('View');
    if (entry.can_edit) perms.push('Edit');
    if (entry.can_manage_access) perms.push('Manage Access');
    return perms.join(', ');
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/locations/${id}`} className="hover:text-foreground transition-colors">← Location</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Access</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Access Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Control who can view or edit this location</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">
              <Crown className="w-3.5 h-3.5" /> Transfer Ownership
            </button>
          )}
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Share Access
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {accessList.length === 0 ? (
            <div className="empty-state py-12">
              <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No shared access yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Invite users by their email address</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {accessList.map(entry => (
                <div key={entry.id} className="flex items-center gap-4 p-4 group">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {entry.user.first_name[0]}{entry.user.last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{getDisplayName(entry.user)}</p>
                    <p className="text-xs text-muted-foreground">{entry.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                      {permBadge(entry)}
                    </span>
                    {isOwner && (
                      <>
                        <button onClick={() => setEditEntry(entry)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setRemoveEntry(entry)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onClose={() => setShowInvite(false)} title="Share Access">
        <form onSubmit={handleInvite} className="space-y-4">
          <Field label="Email Address" required>
            <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" required />
          </Field>
          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissions</p>
            <Checkbox label="View" checked={true} onChange={() => {}} description="Can view all areas, panels, and assets" />
            <Checkbox label="Edit" checked={inviteForm.can_edit} onChange={v => setInviteForm(f => ({ ...f, can_edit: v }))} description="Can add, edit, and delete items" />
            <Checkbox label="Manage Access" checked={inviteForm.can_manage_access} onChange={v => setInviteForm(f => ({ ...f, can_manage_access: v }))} description="Can share access with other users" />
          </div>
          <FormActions loading={saving} onCancel={() => setShowInvite(false)} submitLabel="Grant Access" />
        </form>
      </Dialog>

      {/* Edit permissions */}
      {editEntry && (
        <Dialog open onClose={() => setEditEntry(null)} title="Edit Permissions">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Editing permissions for <strong>{getDisplayName(editEntry.user)}</strong></p>
            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
              <Checkbox label="View" checked={true} onChange={() => {}} description="Always enabled" />
              <Checkbox label="Edit" checked={editEntry.can_edit}
                onChange={v => { const updated = { ...editEntry, can_edit: v }; setEditEntry(updated); handleUpdatePermissions(editEntry, { can_edit: v }); }}
                description="Can add, edit, and delete items" />
              <Checkbox label="Manage Access" checked={editEntry.can_manage_access}
                onChange={v => { const updated = { ...editEntry, can_manage_access: v }; setEditEntry(updated); handleUpdatePermissions(editEntry, { can_manage_access: v }); }}
                description="Can share access with other users" />
            </div>
            <div className="flex justify-end">
              <button onClick={() => setEditEntry(null)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">Done</button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Ownership">
        <form onSubmit={handleTransfer} className="space-y-4">
          <p className="text-sm text-muted-foreground">Transfer ownership to another user who has access to this location. You will lose owner status.</p>
          <Field label="New Owner Email" required>
            <Input type="email" value={transferEmail} onChange={e => setTransferEmail(e.target.value)} placeholder="newowner@example.com" required />
          </Field>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700">
            ⚠️ This action cannot be undone without the new owner's cooperation.
          </div>
          <FormActions loading={saving} onCancel={() => setShowTransfer(false)} submitLabel="Transfer Ownership" />
        </form>
      </Dialog>

      <ConfirmDialog open={!!removeEntry} onClose={() => setRemoveEntry(null)} onConfirm={handleRemove}
        title="Remove Access" description={`Remove access for ${removeEntry ? getDisplayName(removeEntry.user) : ''}?`}
        confirmLabel="Remove Access" variant="destructive" />
    </div>
  );
}
