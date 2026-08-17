'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName } from '@/types';
import {
  Zap, LayoutDashboard, ShieldCheck, ChevronDown, Menu, X, Building2,
  LogOut, Cpu, MapPin, Plug, Users, GitBranch, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = user ? getDisplayName(user) : '';

  // Extract location context from pathname
  const locationMatch = pathname.match(/\/locations\/([^/]+)/);
  const locationId = locationMatch?.[1];

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const topNav = [
    { href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
    { href: '/locations', icon: <Building2 className="w-4 h-4" />, label: 'Locations', exact: false },
  ];

  const locationNav = locationId ? [
    { href: `/locations/${locationId}/panels`, icon: <Cpu className="w-4 h-4" />, label: 'Panels' },
    { href: `/locations/${locationId}/areas`, icon: <MapPin className="w-4 h-4" />, label: 'Areas' },
    { href: `/locations/${locationId}/assets`, icon: <Plug className="w-4 h-4" />, label: 'Assets' },
    { href: `/locations/${locationId}/topology`, icon: <GitBranch className="w-4 h-4" />, label: 'Topology' },
    { href: `/locations/${locationId}/access`, icon: <Users className="w-4 h-4" />, label: 'Access' },
  ] : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div>
              <p className="font-semibold text-sm leading-none">Circuit Manager</p>
              <p className="text-xs text-muted-foreground mt-0.5">Electrical Docs</p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {topNav.map(item => (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={`nav-item ${isActive(item.href) ? 'nav-item-active' : 'text-muted-foreground'} ${collapsed ? 'justify-center px-2' : ''}`}>
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {locationNav.length > 0 && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1">
                <div className="flex items-center gap-1.5 px-3">
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider truncate">
                    This Location
                  </p>
                </div>
              </div>
            )}
            {locationNav.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={`nav-item ${isActive(item.href) ? 'nav-item-active' : 'text-muted-foreground'} ${collapsed ? 'justify-center px-2' : 'pl-5'}`}>
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </>
        )}

        {user?.is_admin && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1">
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-3">Admin</p>
              </div>
            )}
            <Link href="/admin" onClick={() => setMobileOpen(false)}
              className={`nav-item ${isActive('/admin') ? 'nav-item-active' : 'text-muted-foreground'} ${collapsed ? 'justify-center px-2' : ''}`}>
              <ShieldCheck className="w-4 h-4" />
              {!collapsed && <span>Admin</span>}
            </Link>
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button onClick={logout} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button onClick={logout} className="mt-2 w-full flex justify-center p-1.5 hover:bg-secondary rounded-md text-muted-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-card border-r border-border transition-all duration-200 relative ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-secondary transition-colors z-10 shadow-sm"
        >
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm">Circuit Manager</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-md hover:bg-secondary">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-card border-r border-border h-full pt-14">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
