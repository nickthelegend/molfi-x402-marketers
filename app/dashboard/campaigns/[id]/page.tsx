'use client';

import React, { useEffect, useState, use } from 'react';
import { useMarketerStore } from '../../../../store/marketerStore';
import { fetchCampaign, fetchImpressions, toggleCampaign } from '../../../../lib/api';
import { ArrowLeft, CheckCircle2, AlertCircle, Play, Pause, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface CampaignData {
  _id: string;
  title: string;
  type: 'video' | 'image';
  creativeUrl: string;
  bidPerViewUsdc: string;
  budgetUsdc: string;
  spentUsdc: string;
  status: 'pending_review' | 'active' | 'paused' | 'depleted' | 'rejected';
  rejectionReason?: string;
  ctaUrl: string;
  targeting: {
    surfaces: string[];
    modelHints?: string[];
  };
  createdAt: string;
}

interface ImpressionData {
  _id: string;
  viewerSessionHash: string;
  surface: 'frontend' | 'extension';
  type: 'video' | 'image';
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'claimed' | 'rejected' | 'anchored';
  bidPaidUsdc: string;
  batchId?: number;
  settlementTxHash?: string;
}

export default function CampaignDetail({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const { token } = useMarketerStore();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [impressions, setImpressions] = useState<ImpressionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const campaignData = await fetchCampaign(token, params.id);
      setCampaign(campaignData);

      const impressionsData = await fetchImpressions(token, params.id);
      setImpressions(impressionsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load campaign data details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, params.id]);

  const handleToggleStatus = async (newStatus: 'active' | 'paused') => {
    if (!token || !campaign) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await toggleCampaign(token, campaign._id, newStatus);
      setCampaign(updated);
    } catch (err) {
      setError((err as Error).message || 'Failed to update campaign status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-xs font-mono text-zinc-500">
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center text-xs text-zinc-500 font-mono">
        ⚠️ Campaign not found.
      </div>
    );
  }

  const budget = parseFloat(campaign.budgetUsdc);
  const spent = parseFloat(campaign.spentUsdc);
  const progressPercent = Math.min((spent / budget) * 100, 100);

  // Group impressions by date for the analytics chart
  const dateCounts: Record<string, number> = {};
  impressions.forEach((imp) => {
    const statusLower = imp.status.toLowerCase();
    if (statusLower === 'claimed' || statusLower === 'anchored') {
      if (imp.completedAt || imp.startedAt) {
        const dateStr = new Date(imp.completedAt || imp.startedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    }
  });

  const chartData = Object.entries(dateCounts).map(([date, count]) => ({ date, count })).reverse();
  const maxChartVal = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-all font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Campaigns
        </Link>
      </div>

      {/* Header with toggle controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white headline">{campaign.title || 'Campaign Details'}</h2>
          <span className="text-xs font-mono text-zinc-500 block mt-0.5">{campaign._id}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-block rounded px-2.5 py-1 text-[10px] font-bold uppercase ${
              campaign.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : campaign.status === 'pending_review'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {campaign.status.replace('_', ' ')}
          </span>

          {(campaign.status === 'active' || campaign.status === 'paused') && (
            <button
              onClick={() => handleToggleStatus(campaign.status === 'active' ? 'paused' : 'active')}
              disabled={actionLoading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 ${
                campaign.status === 'active'
                  ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
              }`}
            >
              {campaign.status === 'active' ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Resume
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          ⚠️ {error}
        </div>
      )}

      {/* Grid: Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Funding Performance */}
        <div className="md:col-span-2 glass p-6 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-4 headline">Funding Performance</h3>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs text-zinc-400">Spent Progress</span>
              <span className="text-xs font-mono text-white font-bold">
                {spent.toFixed(3)} / {budget.toFixed(2)} USDC ({progressPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4">
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-500">Bid / View</span>
              <div className="text-sm font-mono font-bold text-purple-400 mt-0.5">
                {parseFloat(campaign.bidPerViewUsdc).toFixed(4)} USDC
              </div>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-500">Impressions</span>
              <div className="text-sm font-mono font-bold text-white mt-0.5">
                {impressions.filter(i => ['claimed', 'anchored'].includes(i.status.toLowerCase())).length}
              </div>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-500">Placements</span>
              <div className="text-sm font-semibold text-zinc-400 mt-0.5 capitalize">
                {campaign.targeting.surfaces.join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* Media sources */}
        <div className="glass p-6 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-3 headline">Creative Resource</h3>
            <div className="aspect-video w-full rounded overflow-hidden bg-black border border-zinc-800 flex items-center justify-center mb-3">
              {campaign.type === 'video' ? (
                <video src={campaign.creativeUrl} muted controls={false} className="h-full w-full object-contain" />
              ) : (
                <img src={campaign.creativeUrl} alt="Ad Placement" className="h-full w-full object-contain" />
              )}
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-3 text-[10px] text-zinc-400 flex flex-col gap-1 font-mono">
            <div className="truncate">
              <span className="text-zinc-500">CTA:</span>{' '}
              <a href={campaign.ctaUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                {campaign.ctaUrl} ↗
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Chart */}
      {chartData.length > 0 && (
        <div className="glass p-6 rounded-xl border border-zinc-800">
          <h3 className="text-sm font-bold text-white mb-6 headline">Impressions Over Time</h3>
          <div className="h-32 w-full flex items-end gap-2 px-2 border-b border-zinc-800 pb-1">
            {chartData.map((d, i) => {
              const hPct = (d.count / maxChartVal) * 100;
              return (
                <div key={i} className="flex-1 h-24 flex flex-col justify-end items-center gap-1 group relative">
                  <div
                    className="w-full bg-purple-500/20 group-hover:bg-purple-500/40 border-t border-purple-500 rounded-t transition-all"
                    style={{ height: `${hPct}%` }}
                  />
                  <div className="absolute -top-7 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {d.count}
                  </div>
                  <span className="absolute -bottom-6 text-[9px] font-mono text-zinc-500 whitespace-nowrap">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Impressions Log Table */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-white headline">Impressions Log</h3>
        
        {impressions.length === 0 ? (
          <div className="p-8 border border-zinc-850 bg-zinc-950 rounded-xl text-center text-xs text-zinc-500 font-mono">
            No impressions logged yet. Watch ads on main UI to generate records.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="p-4 font-bold text-zinc-400">Time</th>
                  <th className="p-4 font-bold text-zinc-400">Viewer Hash</th>
                  <th className="p-4 font-bold text-zinc-400">Surface</th>
                  <th className="p-4 font-bold text-zinc-400">Dwell (ms)</th>
                  <th className="p-4 font-bold text-zinc-400">Status</th>
                  <th className="p-4 font-bold text-zinc-400">On-Chain Audit</th>
                </tr>
              </thead>
              <tbody>
                {impressions.map((imp) => {
                  const isAnchored = imp.batchId !== undefined;
                  const dateStr = new Date(imp.completedAt || imp.startedAt).toLocaleString();
                  return (
                    <tr key={imp._id} className="border-b border-zinc-900 hover:bg-zinc-900/20 transition-all font-mono">
                      <td className="p-4 text-zinc-400">{dateStr}</td>
                      <td className="p-4 text-zinc-300 font-semibold truncate max-w-[120px]" title={imp.viewerSessionHash}>
                        {imp.viewerSessionHash.slice(0, 10)}...
                      </td>
                      <td className="p-4 capitalize text-zinc-300">{imp.surface}</td>
                      <td className="p-4 text-zinc-300">{imp.durationMs}ms</td>
                      <td className="p-4">
                        <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                          ['claimed', 'anchored'].includes(imp.status.toLowerCase())
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : imp.status.toLowerCase() === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}>
                          {imp.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/verify/${imp._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 hover:underline transition-all flex items-center gap-1"
                        >
                          Verify Proof <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
