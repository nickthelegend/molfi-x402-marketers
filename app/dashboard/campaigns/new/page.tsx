'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMarketerStore } from '../../../../store/marketerStore';
import { createCampaign } from '../../../../lib/api';
import { ArrowLeft, ArrowRight, Check, Film, Image as ImageIcon, Send } from 'lucide-react';
import Link from 'next/link';

export default function NewCampaign() {
  const { token, balanceUsdc } = useMarketerStore();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'video' | 'image'>('video');
  const [creativeUrl, setCreativeUrl] = useState('');
  const [creativeData, setCreativeData] = useState('');
  const [creativeExtension, setCreativeExtension] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [bidPerViewUsdc, setBidPerViewUsdc] = useState('0.01');
  const [budgetUsdc, setBudgetUsdc] = useState('10.00');
  const [surfaces, setSurfaces] = useState<('frontend' | 'extension')[]>(['frontend', 'extension']);
  const [modelHint, setModelHint] = useState('');
  const [acceptedToS, setAcceptedToS] = useState(false);

  // UX State
  const [previewSrc, setPreviewSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(',')[1];
      setCreativeData(base64Data);
      setCreativeUrl('');
      setPreviewSrc(resultStr);
      
      const ext = file.name.split('.').pop() || '';
      setCreativeExtension(ext);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setCreativeUrl(url);
    setCreativeData('');
    setPreviewSrc(url);
  };

  const validateStep1 = () => {
    if (!creativeUrl && !creativeData) {
      setError('Please provide an ad creative file or URL.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!title.trim()) {
      setError('Campaign title is required.');
      return false;
    }
    if (!ctaUrl.startsWith('https://')) {
      setError('CTA destination URL must start with https://');
      return false;
    }
    const bidVal = parseFloat(bidPerViewUsdc);
    if (isNaN(bidVal) || bidVal < 0.0001 || bidVal > 0.10) {
      setError('Bid per view must be between 0.0001 and 0.10 USDC.');
      return false;
    }
    const budgetVal = parseFloat(budgetUsdc);
    if (isNaN(budgetVal) || budgetVal < 1.00) {
      setError('Campaign budget must be at least 1.00 USDC.');
      return false;
    }
    if (surfaces.length === 0) {
      setError('Please target at least one surface.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!acceptedToS) {
      setError('You must accept the Terms of Service to deploy your campaign.');
      return;
    }

    setLoading(true);
    setError(null);

    const budgetVal = parseFloat(budgetUsdc);
    const balanceVal = parseFloat(balanceUsdc);

    if (budgetVal > balanceVal) {
      setError(`Insufficient balance. Campaign budget: ${budgetVal.toFixed(2)} USDC. Available balance: ${balanceVal.toFixed(2)} USDC.`);
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        title,
        type,
        ctaUrl,
        bidPerViewUsdc: parseFloat(bidPerViewUsdc).toFixed(6),
        budgetUsdc: parseFloat(budgetUsdc).toFixed(6),
        targeting: {
          surfaces,
          modelHints: modelHint ? modelHint.split(',').map(h => h.trim()).filter(Boolean) : undefined,
        },
        frequencyCapPerSessionPer4h: 1,
      };

      if (creativeData) {
        payload.creativeData = creativeData;
        payload.creativeExtension = creativeExtension;
      } else {
        payload.creativeUrl = creativeUrl;
      }

      // Default duration: 15s for video, 5s for image
      payload.durationMs = type === 'video' ? 15000 : 5000;

      await createCampaign(token, payload);
      router.push('/dashboard/campaigns');
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Campaign creation failed');
    } finally {
      setLoading(false);
    }
  };

  const maxImpressions = Math.floor(parseFloat(budgetUsdc) / parseFloat(bidPerViewUsdc)) || 0;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-all font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="text-xs text-text-muted font-mono font-semibold">
          Step {step} of 3
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-text headline">Deploy Ad Campaign</h2>
        <p className="text-xs text-text-muted mt-1">Configure verified-attention placements for your product.</p>
      </div>

      {/* Step Progress Bar */}
      <div className="flex gap-2 w-full h-1 bg-zinc-900 rounded overflow-hidden">
        <div className={`h-full transition-all duration-300 ${step >= 1 ? 'bg-purple-500' : 'bg-transparent'}`} style={{ width: '33.33%' }} />
        <div className={`h-full transition-all duration-300 ${step >= 2 ? 'bg-purple-500' : 'bg-transparent'}`} style={{ width: '33.33%' }} />
        <div className={`h-full transition-all duration-300 ${step >= 3 ? 'bg-purple-500' : 'bg-transparent'}`} style={{ width: '33.33%' }} />
      </div>

      {error && (
        <div className="text-xs text-red-400 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          ⚠️ {error}
        </div>
      )}

      {/* STEP 1: Type & Creative */}
      {step === 1 && (
        <div className="glass p-6 rounded-xl border border-zinc-800 flex flex-col gap-5">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider text-purple-400">Step 1: Creative Type</h3>
          
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setType('video'); setPreviewSrc(''); setCreativeData(''); }}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${type === 'video' ? 'border-purple-500 bg-purple-500/10 text-text' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-text'}`}
            >
              <Film className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold">Video Ad</div>
                <div className="text-[10px] text-zinc-500">MP4, max 30s, 5MB</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setType('image'); setPreviewSrc(''); setCreativeData(''); }}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${type === 'image' ? 'border-purple-500 bg-purple-500/10 text-text' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-text'}`}
            >
              <ImageIcon className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold">Image Dwell Ad</div>
                <div className="text-[10px] text-zinc-500">PNG/JPG, max 2MB</div>
              </div>
            </button>
          </div>

          {/* Upload or URL */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Upload Creative File</label>
              <input
                type="file"
                accept={type === 'video' ? 'video/mp4' : 'image/png, image/jpeg, image/webp'}
                onChange={handleFileUpload}
                className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 file:cursor-pointer"
              />
            </div>

            <div className="flex items-center text-zinc-600 text-xs">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="px-2 uppercase text-[9px] font-bold">Or specify creative url</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Creative Resource URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={creativeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="rounded bg-zinc-950 border border-zinc-800 text-text p-2.5 text-xs outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Live Preview */}
          {previewSrc && (
            <div className="flex flex-col gap-2 border border-zinc-800 rounded-lg p-3 bg-zinc-950">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Live Creative Preview</span>
              <div className="aspect-video w-full rounded overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                {type === 'video' ? (
                  <video src={previewSrc} controls muted className="h-full w-full object-contain" />
                ) : (
                  <img src={previewSrc} alt="Preview" className="h-full w-full object-contain" />
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => { if (validateStep1()) setStep(2); }}
            className="w-full mt-2 bg-purple-600 py-3 rounded-lg text-xs font-bold text-white hover:bg-purple-500 flex items-center justify-center gap-1.5 uppercase transition-colors"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* STEP 2: Details */}
      {step === 2 && (
        <div className="glass p-6 rounded-xl border border-zinc-800 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider text-purple-400">Step 2: Campaign Specifications</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Campaign Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Molfi Premium Chat Launch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded bg-zinc-950 border border-zinc-800 text-text p-2.5 text-xs outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">CTA Destination URL (Starts with https://)</label>
            <input
              type="url"
              required
              placeholder="https://..."
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              className="rounded bg-zinc-950 border border-zinc-800 text-text p-2.5 text-xs outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Bid / View (USDC, 0.0001 - 0.10)</label>
              <input
                type="text"
                required
                value={bidPerViewUsdc}
                onChange={(e) => setBidPerViewUsdc(e.target.value)}
                className="rounded bg-zinc-950 border border-zinc-800 text-text p-2.5 text-xs outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Budget (USDC, min 1.00)</label>
              <input
                type="text"
                required
                value={budgetUsdc}
                onChange={(e) => setBudgetUsdc(e.target.value)}
                className="rounded bg-zinc-950 border border-zinc-800 text-text p-2.5 text-xs outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          {/* Targeting Surface */}
          <div className="flex flex-col gap-2 border border-zinc-900 rounded p-3">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Surface Placement Targeting</span>
            <div className="flex gap-6 mt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={surfaces.includes('frontend')}
                  onChange={(e) => {
                    if (e.target.checked) setSurfaces([...surfaces, 'frontend']);
                    else setSurfaces(surfaces.filter(s => s !== 'frontend'));
                  }}
                  className="rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-0 focus:ring-offset-0"
                />
                Molfi Web Chat
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={surfaces.includes('extension')}
                  onChange={(e) => {
                    if (e.target.checked) setSurfaces([...surfaces, 'extension']);
                    else setSurfaces(surfaces.filter(s => s !== 'extension'));
                  }}
                  className="rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-0 focus:ring-offset-0"
                />
                VS Code Extension
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Model Hints (Optional, comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. claude-sonnet-4.5, llama-3.3-70b"
              value={modelHint}
              onChange={(e) => setModelHint(e.target.value)}
              className="rounded bg-zinc-950 border border-zinc-800 text-text p-2.5 text-xs outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 bg-zinc-900 py-3 rounded-lg text-xs font-bold text-zinc-400 hover:text-text hover:bg-zinc-850 uppercase transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => { if (validateStep2()) setStep(3); }}
              className="flex-1 bg-purple-600 py-3 rounded-lg text-xs font-bold text-white hover:bg-purple-500 flex items-center justify-center gap-1.5 uppercase transition-colors"
            >
              Review Details <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="glass p-6 rounded-xl border border-zinc-800 flex flex-col gap-5">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider text-purple-400">Step 3: Review & Deploy</h3>

          {/* Configuration Summary Table */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3 text-xs font-medium">
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Campaign Title</span>
              <span className="text-text">{title}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Ad Type</span>
              <span className="text-text capitalize">{type} Ad</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">CTA Destination</span>
              <span className="text-purple-400 font-mono overflow-hidden text-ellipsis max-w-[250px]">{ctaUrl}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Bid / View</span>
              <span className="text-text font-mono">{bidPerViewUsdc} USDC</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Total Budget</span>
              <span className="text-text font-mono">{budgetUsdc} USDC</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Target Surfaces</span>
              <span className="text-text capitalize">{surfaces.join(', ')}</span>
            </div>
            {modelHint && (
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Premium Model hints</span>
                <span className="text-text">{modelHint}</span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500 font-semibold">Max Guaranteed Impressions</span>
              <span className="text-purple-400 font-bold font-mono text-sm">{maxImpressions} views</span>
            </div>
          </div>

          {/* ToS Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer text-xs text-zinc-400 hover:text-text transition-colors">
            <input
              type="checkbox"
              checked={acceptedToS}
              onChange={(e) => setAcceptedToS(e.target.checked)}
              className="mt-0.5 rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-0 focus:ring-offset-0"
            />
            <span>
              I accept the Molfi Advertising Terms of Service and understand that the campaign budget is immediately debited from my active marketer account balance upon deployment.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 bg-zinc-900 py-3 rounded-lg text-xs font-bold text-zinc-400 hover:text-text hover:bg-zinc-850 uppercase transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-purple-600 py-3 rounded-lg text-xs font-bold text-white hover:bg-purple-500 flex items-center justify-center gap-1.5 uppercase transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5 animate-pulse" /> {loading ? 'Deploying...' : 'Deploy Budget'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
