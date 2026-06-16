'use client';

import React, { useEffect, useState } from 'react';
import { useMarketerStore } from '../../../store/marketerStore';
import { fetchCampaigns } from '../../../lib/api';
import Link from 'next/link';
import { Megaphone, Plus } from 'lucide-react';

interface CampaignData {
  _id: string;
  mp4Url: string;
  bidPerViewUsdc: string;
  budgetUsdc: string;
  spentUsdc: string;
  status: 'active' | 'paused' | 'depleted';
  createdAt: string;
}

export default function CampaignsList() {
  const { token } = useMarketerStore();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchCampaigns(token);
      setCampaigns(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load campaigns list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-text-muted">
        Loading campaigns...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text headline">Advertising Campaigns</h2>
          <p className="text-xs text-text-muted mt-1">Manage and track your video advertisement distributions.</p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="pill-accent px-5 py-2.5 text-xs font-bold transition-all hover:scale-105 hover:brightness-110 flex items-center gap-1.5 uppercase shadow-lg shadow-accent/20"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
      </div>

      {error && (
        <div className="text-xs text-danger rounded-lg border border-danger/20 bg-danger/5 p-3 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-border bg-surface rounded-xl p-12 text-center">
          <Megaphone className="h-10 w-10 text-text-dim mb-4" />
          <h3 className="text-lg font-bold text-text headline">No Campaigns Found</h3>
          <p className="text-xs text-text-muted max-w-xs mx-auto mt-2 leading-relaxed">
            Create your first video ad campaign to start reaching users. Make sure your balance is funded.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="mt-6 inline-block pill-accent px-6 py-2.5 text-xs font-bold uppercase transition-all hover:scale-105"
          >
            Create First Campaign
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="p-4 font-bold text-text">Campaign ID</th>
                <th className="p-4 font-bold text-text">Status</th>
                <th className="p-4 font-bold text-text">Bid / View</th>
                <th className="p-4 font-bold text-text">Budget</th>
                <th className="p-4 font-bold text-text">Spent</th>
                <th className="p-4 font-bold text-text">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id} className="border-b border-border/40 hover:bg-surface-2/30 transition-all font-mono">
                  <td className="p-4 font-semibold text-text select-all" title={c._id}>
                    {c._id.slice(0, 8)}...{c._id.slice(-6)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                        c.status === 'active'
                          ? 'bg-success/10 text-success border border-success/20'
                          : c.status === 'depleted'
                          ? 'bg-danger/10 text-danger border border-danger/20'
                          : 'bg-warning/10 text-warning border border-warning/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-accent-2">{parseFloat(c.bidPerViewUsdc).toFixed(3)} USDC</td>
                  <td className="p-4 text-text">{parseFloat(c.budgetUsdc).toFixed(2)} USDC</td>
                  <td className="p-4 text-text-muted">{parseFloat(c.spentUsdc).toFixed(3)} USDC</td>
                  <td className="p-4 font-sans font-semibold">
                    <Link
                      href={`/dashboard/campaigns/${c._id}`}
                      className="text-accent hover:text-accent-2 hover:underline transition-all"
                    >
                      View Analytics
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
