'use client';

import React, { useEffect, useState, use } from 'react';
import { useMarketerStore } from '../../../../store/marketerStore';
import { fetchCampaign, fetchImpressions } from '../../../../lib/api';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface CampaignData {
  _id: string;
  mp4Url: string;
  bidPerViewUsdc: string;
  budgetUsdc: string;
  spentUsdc: string;
  status: 'active' | 'paused' | 'depleted';
  ctaUrl: string;
  createdAt: string;
}

interface ImpressionData {
  _id: string;
  viewerSessionHash: string;
  watchedMs: number;
  completedAt: string;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-text-muted">
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-xl mx-auto p-4 text-center text-xs text-text-muted font-mono">
        ⚠️ Campaign not found.
      </div>
    );
  }

  const budget = parseFloat(campaign.budgetUsdc);
  const spent = parseFloat(campaign.spentUsdc);
  const progressPercent = Math.min((spent / budget) * 100, 100);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-all font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Campaigns
        </Link>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text headline">Campaign Details</h2>
        <span className="text-xs font-mono text-text-dim block mt-0.5">{campaign._id}</span>
      </div>

      {error && (
        <div className="text-xs text-danger rounded-lg border border-danger/20 bg-danger/5 p-3 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Grid: Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Budget details */}
        <div className="md:col-span-2 glass p-6 rounded-xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text mb-4 headline">Funding Performance</h3>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs text-text-muted">Spent Progress</span>
              <span className="text-xs font-mono text-text font-bold">
                {spent.toFixed(3)} / {budget.toFixed(2)} USDC ({progressPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-border rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <span className="text-[9px] uppercase font-bold text-text-dim">Bid / View</span>
              <div className="text-sm font-mono font-bold text-accent-2 mt-0.5">
                {parseFloat(campaign.bidPerViewUsdc).toFixed(3)} USDC
              </div>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-text-dim">Frequency Cap</span>
              <div className="text-sm font-mono font-bold text-text mt-0.5">No Cap</div>
            </div>
          </div>
        </div>

        {/* Card 2: Status & Video details */}
        <div className="glass p-6 rounded-xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text mb-3 headline">Campaign Status</h3>
            <span
              className={`inline-block rounded px-2.5 py-0.5 text-[9px] font-bold uppercase mb-4 ${
                campaign.status === 'active'
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}
            >
              {campaign.status}
            </span>
          </div>
          <div className="border-t border-border pt-4 text-[10px] text-text-muted flex flex-col gap-1.5 font-mono">
            <div className="truncate">
              <span className="text-text-dim">Video:</span>{' '}
              <a href={campaign.mp4Url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                MP4 Source ↗
              </a>
            </div>
            <div className="truncate">
              <span className="text-text-dim">Destination:</span>{' '}
              <a href={campaign.ctaUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {campaign.ctaUrl} ↗
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Impressions Table list */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-text headline">Impressions Log</h3>
        
        {impressions.length === 0 ? (
          <div className="p-8 border border-border bg-surface rounded-xl text-center text-xs text-text-muted font-mono">
            No impressions logged yet. Watch ads on main UI to generate records.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="p-4 font-bold text-text">Impression ID</th>
                  <th className="p-4 font-bold text-text">Viewer Session</th>
                  <th className="p-4 font-bold text-text">Duration</th>
                  <th className="p-4 font-bold text-text">On-Chain Anchor</th>
                  <th className="p-4 font-bold text-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {impressions.map((imp) => {
                  const isAnchored = imp.batchId !== undefined;
                  return (
                    <tr key={imp._id} className="border-b border-border/40 hover:bg-surface-2/30 transition-all font-mono">
                      <td className="p-4 font-semibold text-text select-all" title={imp._id}>
                        {imp._id.slice(0, 8)}...{imp._id.slice(-6)}
                      </td>
                      <td className="p-4 text-text-muted truncate max-w-[120px]" title={imp.viewerSessionHash}>
                        {imp.viewerSessionHash.slice(0, 10)}...
                      </td>
                      <td className="p-4">{(imp.watchedMs / 1000).toFixed(1)}s</td>
                      <td className="p-4">
                        {isAnchored ? (
                          <div className="flex items-center gap-1.5 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Batch #{imp.batchId}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-warning">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Pending Anchor</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-sans font-semibold">
                        <Link
                          href={`/verify/${imp._id}`}
                          className="text-accent hover:text-accent-2 hover:underline transition-all"
                        >
                          Audit Proof
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
