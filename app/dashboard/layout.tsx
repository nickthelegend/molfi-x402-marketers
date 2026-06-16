'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMarketerStore } from '../../store/marketerStore';
import { LayoutDashboard, Megaphone, Receipt, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, walletAddress, logout } = useMarketerStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  if (!mounted || !token) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center font-mono text-xs">
        Loading Session...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text select-none">
      
      {/* Sidebar Navigation */}
      <div className="flex w-64 flex-col bg-surface border-r border-border p-4">
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-8 mt-2">
          <svg className="h-6 w-6 text-accent animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22L12 17L22 22L12 2Z" fill="currentColor" />
          </svg>
          <span className="text-sm font-bold tracking-wider text-text font-display">
            MOLFI<span className="text-accent">.</span>MARKETERS
          </span>
        </div>

        {/* User address status */}
        <div className="mb-6 p-3 bg-surface-2 rounded-lg border border-border text-[10px] font-mono text-text-muted">
          <span className="block text-text-dim text-[8px] uppercase font-bold tracking-wide mb-0.5">Connected Wallet</span>
          <span className="text-text block truncate" title={walletAddress || ''}>
            {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : ''}
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1.5 flex-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-all"
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>
          <Link
            href="/dashboard/campaigns"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-all"
          >
            <Megaphone className="h-4 w-4" />
            Campaigns
          </Link>
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-all"
          >
            <Receipt className="h-4 w-4" />
            Billing & Deposits
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-all"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-danger hover:bg-danger/5 transition-all mt-auto cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </nav>
      </div>

      {/* Main Content Workspace Frame */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex h-14 items-center justify-between border-b border-border px-8 bg-surface/50">
          <span className="text-xs font-bold text-text-muted tracking-wide uppercase">Workspace</span>
          <span className="rounded bg-accent/15 border border-accent/25 px-2.5 py-0.5 text-[9px] font-bold text-accent-2 uppercase tracking-wide">
            Avalanche Fuji (43113)
          </span>
        </div>
        <div className="flex-1 overflow-auto p-8 relative">
          {children}
        </div>
      </div>
    </div>
  );
}
