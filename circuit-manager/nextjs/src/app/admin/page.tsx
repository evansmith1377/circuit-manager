'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { type User, getDisplayName } from '@/types';
import { useToast } from '@/hooks/useToast';
import { Shield, ShieldCheck, Users, Crown } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/dialog';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleAdmin, setToggleAdmin] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAdmin = async () => {
    if (!toggleAdmin) return;
    await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_admin', id: toggleAdmin.id, is_admin: !toggleAdmin.is_admin }),
    });
    setUsers(u => u.map(x => x.id === toggleAdmin.id ? { ...x, is_admin: !x.is_admin } : x));
    toast({ title: `Admin ${toggleAdmin.is_admin ? 'removed' : 'granted'}`, variant: 'success' });
    setToggleAdmin(null);
  };

  const admins = users.filter(u => u.is_admin);
  const regularUsers = users.filter(u => !u.is_admin);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">System Administration</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{users.length} registered users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Users', value: users.length, icon: <Users className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-500/10' },
          { label: 'Administrators', value: admins.length, icon: <ShieldCheck className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-500/10' },
          { label: 'Regular Users', value: regularUsers.length, icon: <Shield className="w-5 h-5 text-green-500" />, bg: 'bg-green-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-secondary/30 border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Users</h2>
          </div>
          <div className="divide-y divide-border">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 p-4 group">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">{u.first_name[0]}{u.last_name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{getDisplayName(u)}</p>
                    {u.id === currentUser?.id && <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">You</span>}
                    {u.is_admin && <span className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full px-2 py-0.5 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => setToggleAdmin(u)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toggleAdmin}
        onClose={() => setToggleAdmin(null)}
        onConfirm={handleToggleAdmin}
        title={toggleAdmin?.is_admin ? 'Remove Admin' : 'Grant Admin'}
        description={toggleAdmin?.is_admin
          ? `Remove admin privileges from ${toggleAdmin ? getDisplayName(toggleAdmin) : ''}?`
          : `Grant system administrator privileges to ${toggleAdmin ? getDisplayName(toggleAdmin) : ''}?`
        }
        confirmLabel={toggleAdmin?.is_admin ? 'Remove Admin' : 'Grant Admin'}
      />
    </div>
  );
}
