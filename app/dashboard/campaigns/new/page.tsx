'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMarketerStore } from '../../../../store/marketerStore';
import { createCampaign } from '../../../../lib/api';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

export default function NewCampaign() {
  const { token, balanceUsdc } = useMarketerStore();
  const router = useRouter();

  const [mp4Url, setMp4Url] = useState('https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blockchain-nodes-43034-large.mp4');
  const [durationMs, setDurationMs] = useState(15000);
  const [ctaUrl, setCtaUrl] = useState('https://molfi.fun');
  const [bidPerView, setBidPerView] = useState('0.01');
  const [budget, setBudget] = useState('5.00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    const bidVal = parseFloat(bidPerView);
    const budgetVal = parseFloat(budget);
    const balanceVal = parseFloat(balanceUsdc);

    if (budgetVal > balanceVal) {
      setError(`Insufficient balance. Available balance: ${balanceVal.toFixed(2)} USDC, Requested budget: ${budgetVal.toFixed(2)} USDC.`);
      setLoading(false);
      return;
    }

    if (bidVal > budgetVal) {
      setError('Bid per view cannot exceed total campaign budget.');
      setLoading(false);
      return;
    }

    try {
      await createCampaign(token, {
        mp4Url,
        durationMs,
        ctaUrl,
        bidPerViewUsdc: bidVal.toFixed(6),
        budgetUsdc: budgetVal.toFixed(6),
        frequencyCap: 0,
      });

      router.push('/dashboard/campaigns');
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      
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
        <h2 className="text-2xl font-bold text-text headline">Create Campaign</h2>
        <p className="text-xs text-text-muted mt-1">Deploy a new video ad budget to the Molfi player network.</p>
      </div>

      {error && (
        <div className="text-xs text-danger rounded-lg border border-danger/20 bg-danger/5 p-3 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass p-6 rounded-xl border border-border flex flex-col gap-4">
        
        {/* mp4Url */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Video MP4 URL</label>
          <input
            type="url"
            required
            value={mp4Url}
            onChange={(e) => setMp4Url(e.target.value)}
            className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent"
          />
        </div>

        {/* durationMs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Video Duration (ms)</label>
          <input
            type="number"
            required
            min={1000}
            max={60000}
            value={durationMs}
            onChange={(e) => setDurationMs(parseInt(e.target.value))}
            className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent font-mono"
          />
        </div>

        {/* ctaUrl */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">CTA Destination URL</label>
          <input
            type="url"
            required
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent"
          />
        </div>

        {/* Bid & Budget Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Bid / View (USDC)</label>
            <input
              type="text"
              required
              value={bidPerView}
              onChange={(e) => setBidPerView(e.target.value)}
              className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Budget (USDC)</label>
            <input
              type="text"
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent font-mono"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 pill-accent py-3 text-xs font-bold transition-all hover:brightness-110 flex items-center justify-center gap-1.5 uppercase shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> {loading ? 'Deploying...' : 'Deploy Campaign'}
        </button>
      </form>
    </div>
  );
}
