'use client';

import React, { useState } from 'react';
import { Send, Upload } from 'lucide-react';

export interface CampaignFormData {
  mp4Url: string;
  durationMs: number;
  ctaUrl: string;
  bidPerViewUsdc: string;
  budgetUsdc: string;
}

interface CampaignFormProps {
  balanceUsdc: string;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  loading: boolean;
}

export function CampaignForm({ balanceUsdc, onSubmit, loading }: CampaignFormProps) {
  const [mp4Url, setMp4Url] = useState('https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blockchain-nodes-43034-large.mp4');
  const [durationMs, setDurationMs] = useState(15000);
  const [ctaUrl, setCtaUrl] = useState('https://molfi.fun');
  const [bidPerView, setBidPerView] = useState('0.01');
  const [budget, setBudget] = useState('5.00');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size client-side <= 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Video file size exceeds the 5MB limit.');
      return;
    }

    setError(null);
    // Create temporary URL to mock/simulate the upload
    const objectUrl = URL.createObjectURL(file);
    setMp4Url(objectUrl);

    // Read video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(objectUrl);
      const duration = Math.round(video.duration * 1000);
      if (duration > 30000) {
        setError('Video duration exceeds the 30s limit.');
      } else {
        setDurationMs(duration);
      }
    };
    video.src = objectUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const bidVal = parseFloat(bidPerView);
    const budgetVal = parseFloat(budget);
    const balanceVal = parseFloat(balanceUsdc);

    // Validate USDC Decimals (max 6 decimal digits)
    const usdcRegex = /^\d+(\.\d{1,6})?$/;
    if (!usdcRegex.test(bidPerView) || !usdcRegex.test(budget)) {
      setError('USDC amounts must have at most 6 decimal places.');
      return;
    }

    if (budgetVal > balanceVal) {
      setError(`Insufficient balance. Available balance: ${balanceVal.toFixed(2)} USDC, Requested budget: ${budgetVal.toFixed(2)} USDC.`);
      return;
    }

    if (bidVal > budgetVal) {
      setError('Bid per view cannot exceed total campaign budget.');
      return;
    }

    if (durationMs > 30000) {
      setError('Campaign videos cannot exceed 30 seconds.');
      return;
    }

    await onSubmit({
      mp4Url,
      durationMs,
      ctaUrl,
      bidPerViewUsdc: bidVal.toFixed(6),
      budgetUsdc: budgetVal.toFixed(6),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass p-6 rounded-xl border border-border flex flex-col gap-4">
      {error && (
        <div className="text-xs text-danger rounded-lg border border-danger/20 bg-danger/5 p-3 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* File Upload / Drag & Drop */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mp4File" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Upload MP4 Video (Max 5MB / 30s)</label>
        <div className="border border-dashed border-border-2 rounded-lg p-4 flex flex-col items-center justify-center bg-surface hover:bg-surface-2 transition-all relative">
          <Upload className="h-6 w-6 text-text-muted mb-2" />
          <span className="text-xs text-text-muted">Drag and drop file, or browse</span>
          <input
            id="mp4File"
            type="file"
            accept="video/mp4"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* mp4Url */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mp4Url" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Or Video MP4 URL</label>
        <input
          id="mp4Url"
          type="url"
          required
          value={mp4Url}
          onChange={(e) => setMp4Url(e.target.value)}
          className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent"
        />
      </div>

      {/* durationMs */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="durationMs" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Video Duration (ms)</label>
        <input
          id="durationMs"
          type="number"
          required
          min={1000}
          max={30000}
          value={durationMs}
          onChange={(e) => setDurationMs(parseInt(e.target.value))}
          className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent font-mono"
        />
      </div>

      {/* ctaUrl */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ctaUrl" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">CTA Destination URL</label>
        <input
          id="ctaUrl"
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
          <label htmlFor="bidPerView" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Bid / View (USDC)</label>
          <input
            id="bidPerView"
            type="text"
            required
            value={bidPerView}
            onChange={(e) => setBidPerView(e.target.value)}
            className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="budget" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Budget (USDC)</label>
          <input
            id="budget"
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
  );
}
