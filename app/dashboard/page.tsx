'use client';

import React, { useEffect, useState } from 'react';
import { useMarketerStore } from '../../store/marketerStore';
import { fetchStats, fetchProfile } from '../../lib/api';
import { BarChart3, Megaphone, Coins, Award } from 'lucide-react';

interface Stats {
  totalSpendUsdc: string;
  totalImpressions: number;
  avgWatchPercent: number;
  activeCampaigns: number;
}

export default function DashboardOverview() {
  const { token, balanceUsdc, setBalance } = useMarketerStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const profile = await fetchProfile(token);
      setBalance(profile.balanceUsdc);

      const statsData = await fetchStats(token);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard overview data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-text-muted">
        Fetching campaign data...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-text headline">Dashboard Overview</h2>
        <p className="text-xs text-text-muted mt-1">Review your campaign impression statistics and lock funding details.</p>
      </div>

      {error && (
        <div className="text-xs text-danger rounded-lg border border-danger/20 bg-danger/5 p-3 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card 1: Balance */}
        <div className="p-5 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Available Balance</span>
            <div className="text-2xl font-bold text-text mt-1.5 font-mono">{parseFloat(balanceUsdc).toFixed(2)} USDC</div>
          </div>
          <Coins className="h-5 w-5 text-accent" />
        </div>

        {/* Card 2: Spent */}
        <div className="p-5 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Total Campaign Spend</span>
            <div className="text-2xl font-bold text-text mt-1.5 font-mono">
              {stats ? parseFloat(stats.totalSpendUsdc).toFixed(2) : '0.00'} USDC
            </div>
          </div>
          <BarChart3 className="h-5 w-5 text-accent" />
        </div>

        {/* Card 3: Impressions */}
        <div className="p-5 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Total Impressions</span>
            <div className="text-2xl font-bold text-text mt-1.5 font-mono">
              {stats ? stats.totalImpressions : 0}
            </div>
          </div>
          <Award className="h-5 w-5 text-accent" />
        </div>

        {/* Card 4: Campaigns */}
        <div className="p-5 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Active Campaigns</span>
            <div className="text-2xl font-bold text-text mt-1.5 font-mono">
              {stats ? stats.activeCampaigns : 0}
            </div>
          </div>
          <Megaphone className="h-5 w-5 text-accent" />
        </div>

      </div>

      {/* SVG Custom Impressions Graph */}
      <div className="p-6 rounded-xl border border-border bg-surface-2">
        <h3 className="text-sm font-bold text-text mb-4 headline">Impressions Over Time</h3>
        <div className="w-full h-64 bg-black/40 border border-border rounded-lg p-4 relative flex items-end justify-between">
          {/* Custom SVG line chart for absolute React 19 safety & premium visuals */}
          <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ad46ff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ad46ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid Lines */}
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1f1f26" strokeWidth="1" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="#1f1f26" strokeWidth="1" />
            <line x1="0" y1="150" x2="500" y2="150" stroke="#1f1f26" strokeWidth="1" />
            
            {/* Area under curve */}
            <path
              d="M 0 200 L 50 160 L 100 180 L 150 120 L 200 140 L 250 80 L 300 90 L 350 40 L 400 60 L 450 20 L 500 10 L 500 200 Z"
              fill="url(#glow)"
            />
            {/* Main curve line */}
            <path
              d="M 0 200 L 50 160 L 100 180 L 150 120 L 200 140 L 250 80 L 300 90 L 350 40 L 400 60 L 450 20 L 500 10"
              fill="none"
              stroke="#ad46ff"
              strokeWidth="3"
            />
          </svg>
          {/* Label Overlays */}
          <span className="absolute bottom-2 left-4 text-[9px] font-mono text-text-dim">30 Days Ago</span>
          <span className="absolute bottom-2 right-4 text-[9px] font-mono text-text-dim">Today</span>
        </div>
      </div>
    </div>
  );
}
