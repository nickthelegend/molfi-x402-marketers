'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMarketerStore } from '../../../../store/marketerStore';
import { uploadCreative, syncCampaignMetadata } from '../../../../lib/api';
import { ArrowLeft, ArrowRight, Check, Film, Image as ImageIcon, Send } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, parseEventLogs } from 'viem';
import adMarketAbi from '../../../../lib/abi/MolfiAdMarket.json';

const AD_MARKET = (process.env.NEXT_PUBLIC_AD_MARKET_ADDRESS || '0x4b8de9f9f081ab9251daa0679b251f665ca11ffb') as `0x${string}`;
const USDC_FUJI = (process.env.NEXT_PUBLIC_USDC_FUJI_ADDRESS || '0x5425890298aed601595a70AB815c96711a31Bc65') as `0x${string}`;

const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export default function NewCampaign() {
  const { token } = useMarketerStore();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Step state
  const [step, setStep] = useState(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'video' | 'image'>('video');
  const [creativeFile, setCreativeFile] = useState<File | null>(null);
  const [ctaUrl, setCtaUrl] = useState('');
  const [bidPerViewUsdc, setBidPerViewUsdc] = useState('0.01');
  const [budgetUsdc, setBudgetUsdc] = useState('10.00');
  const [surfaces, setSurfaces] = useState<('chat-web' | 'extension')[]>(['chat-web', 'extension']);
  const [modelHint, setModelHint] = useState('');
  const [acceptedToS, setAcceptedToS] = useState(false);

  // UX State
  const [previewSrc, setPreviewSrc] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Tx/Deployment checklist state
  const [txStep, setTxStep] = useState<'idle' | 'uploading' | 'approving' | 'creating' | 'syncing' | 'success'>('idle');
  const [syncMessage, setSyncMessage] = useState('Publishing targeting parameters and headers to indexer');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCreativeFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (!creativeFile) {
      setError('Please upload an ad creative file.');
      return false;
    }
    // Basic local validation
    if (type === 'video') {
      if (creativeFile.size > 20 * 1024 * 1024) {
        setError('Video file size exceeds 20MB limit.');
        return false;
      }
    } else {
      if (creativeFile.size > 8 * 1024 * 1024) {
        setError('Image file size exceeds 8MB limit.');
        return false;
      }
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
    if (!isConnected || !address) {
      setError('Please connect your Web3 wallet using the header connection button.');
      return;
    }
    if (!acceptedToS) {
      setError('You must accept the Terms of Service to deploy your campaign.');
      return;
    }
    if (!creativeFile) {
      setError('Ad creative file is missing.');
      return;
    }
    if (!publicClient) {
      setError('Web3 provider not available.');
      return;
    }

    setError(null);

    let creativeCid = '';
    let creativeCidHash: `0x${string}` = '0x';
    let durationMs = type === 'video' ? 15000 : 5000;
    let thumbnailCid = '';

    try {
      // 1. Upload to Pinata
      setTxStep('uploading');
      const uploadRes = await uploadCreative(token, creativeFile, type);
      creativeCid = uploadRes.cid;
      creativeCidHash = uploadRes.cidHash;
      if (uploadRes.durationMs) {
        durationMs = uploadRes.durationMs;
      }
      if (uploadRes.thumbnailCid) {
        thumbnailCid = uploadRes.thumbnailCid;
      }

      // 2. Approve USDC
      setTxStep('approving');
      const budgetUnits = parseUnits(budgetUsdc, 6);
      const approveHash = await writeContractAsync({
        address: USDC_FUJI,
        abi: erc20Abi,
        functionName: 'approve',
        args: [AD_MARKET, budgetUnits],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 3. Create Campaign Contract
      setTxStep('creating');
      const rewardUnits = parseUnits(bidPerViewUsdc, 6);
      const startTime = BigInt(Math.floor(Date.now() / 1000) - 10);
      const endTime = startTime + BigInt(7 * 24 * 3600); // 7 days duration
      const contentURI = `https://gateway.pinata.cloud/ipfs/${creativeCid}`;
      const kindEnum = type === 'video' ? 2 : 1; // enum AdKind { TEXT, IMAGE, VIDEO }

      const createHash = await writeContractAsync({
        address: AD_MARKET,
        abi: adMarketAbi.abi,
        functionName: 'createCampaign',
        args: [creativeCidHash, contentURI, budgetUnits, rewardUnits, startTime, endTime, kindEnum],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

      const logs = parseEventLogs({
        abi: adMarketAbi.abi,
        logs: receipt.logs,
      });
      const event = logs.find((l: any) => l.eventName === 'CampaignCreated');
      if (!event) {
        throw new Error('CampaignCreated event not found in logs');
      }
      const onchainId = Number((event as any).args.id);

      // 4. Sync Metadata with Server
      setTxStep('syncing');
      setSyncMessage('Publishing targeting parameters and headers to indexer');

      const maxRetries = 15;
      const retryIntervalMs = 3000; // poll every 3 seconds (up to 45s total, daemon runs every 15s)
      let synced = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            setSyncMessage(`Waiting for block indexer (attempt ${attempt}/${maxRetries})...`);
          }
          await syncCampaignMetadata(token, {
            onchainId,
            title,
            ctaUrl,
            targeting: {
              surfaces,
              models: modelHint ? modelHint.split(',').map(h => h.trim()).filter(Boolean) : undefined,
            },
            thumbnailCid: thumbnailCid || undefined,
            durationMs,
            contentCid: creativeCid,
          });
          synced = true;
          break;
        } catch (err: any) {
          const msg = (err.message || '').toLowerCase();
          const isIndexerDelay = msg.includes('indexed') || msg.includes('retry') || msg.includes('404');
          if (isIndexerDelay && attempt < maxRetries) {
            console.log(`Campaign metadata sync attempt ${attempt} failed (not yet indexed). Retrying in ${retryIntervalMs / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
          } else {
            throw err;
          }
        }
      }

      if (!synced) {
        throw new Error('Campaign indexing timed out. Please try again.');
      }

      setTxStep('success');
      setTimeout(() => {
        router.push('/dashboard/campaigns');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Ad campaign deployment failed');
    }
  };

  const maxImpressions = Math.floor(parseFloat(budgetUsdc) / parseFloat(bidPerViewUsdc)) || 0;

  if (txStep !== 'idle') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-full rounded-2xl glass p-8 border-2 border-border shadow-2xl relative overflow-hidden bg-zinc-950/50">
          <h2 className="text-xl font-bold tracking-tight headline mb-6 text-text">Deploying Campaign</h2>
          
          <div className="flex flex-col gap-6 text-left text-xs font-semibold">
            {/* Step 1: Upload */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center border border-zinc-800 bg-zinc-900">
                {txStep === 'uploading' ? (
                  <div className="h-3 w-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : ['approving', 'creating', 'syncing', 'success'].includes(txStep) ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-zinc-700" />
                )}
              </div>
              <div>
                <div className="text-text font-bold">1. Uploading Creative to IPFS</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">Optimizing and publishing file metadata via Pinata</div>
              </div>
            </div>

            {/* Step 2: Approve */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center border border-zinc-800 bg-zinc-900">
                {txStep === 'approving' ? (
                  <div className="h-3 w-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : ['creating', 'syncing', 'success'].includes(txStep) ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-zinc-700" />
                )}
              </div>
              <div>
                <div className="text-text font-bold">2. Approving USDC Budget</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">Confirm transaction in your wallet to permit token transfer</div>
              </div>
            </div>

            {/* Step 3: Create Contract */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center border border-zinc-800 bg-zinc-900">
                {txStep === 'creating' ? (
                  <div className="h-3 w-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : ['syncing', 'success'].includes(txStep) ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-zinc-700" />
                )}
              </div>
              <div>
                <div className="text-text font-bold">3. Deploying Campaign Contract</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">Registering campaign and locking escrow on Fuji C-Chain</div>
              </div>
            </div>

            {/* Step 4: Sync Server */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full flex items-center justify-center border border-zinc-800 bg-zinc-900">
                {txStep === 'syncing' ? (
                  <div className="h-3 w-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : txStep === 'success' ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-zinc-700" />
                )}
              </div>
              <div>
                <div className="text-text font-bold">4. Syncing Campaign Metadata</div>
                <div className="text-[10px] text-text-muted font-normal mt-0.5">{syncMessage}</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 text-xs text-red-400 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-left">
              ⚠️ Deployment Failed:<br/>
              <span className="font-mono mt-1 block break-words text-[10px]">{error}</span>
              <button
                onClick={() => { setError(null); setTxStep('idle'); }}
                className="mt-3 w-full bg-zinc-900 py-2 rounded text-[10px] font-bold text-text hover:bg-zinc-800 uppercase"
              >
                Go Back & Retry
              </button>
            </div>
          )}

          {txStep === 'success' && (
            <div className="mt-6 text-xs text-green-400 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              🎉 Campaign deployed successfully!<br/>
              Redirecting to dashboard...
            </div>
          )}
        </div>
      </div>
    );
  }

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
        <div className="glass p-6 rounded-xl border border-zinc-800 flex flex-col gap-5 bg-zinc-950/20">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider text-purple-400">Step 1: Creative Type</h3>
          
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setType('video'); setPreviewSrc(''); setCreativeFile(null); }}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${type === 'video' ? 'border-purple-500 bg-purple-500/10 text-text' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-text'}`}
            >
              <Film className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold">Video Ad</div>
                <div className="text-[10px] text-zinc-500">MP4, max 20MB, 3-60s</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setType('image'); setPreviewSrc(''); setCreativeFile(null); }}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${type === 'image' ? 'border-purple-500 bg-purple-500/10 text-text' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-text'}`}
            >
              <ImageIcon className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs font-bold">Image Dwell Ad</div>
                <div className="text-[10px] text-zinc-500">PNG/JPG/WEBP, max 8MB</div>
              </div>
            </button>
          </div>

          {/* Upload File */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Upload Creative File</label>
              <input
                type="file"
                accept={type === 'video' ? 'video/mp4, video/webm' : 'image/png, image/jpeg, image/webp'}
                onChange={handleFileUpload}
                className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 file:cursor-pointer"
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
        <div className="glass p-6 rounded-xl border border-zinc-800 flex flex-col gap-4 bg-zinc-950/20">
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
                  checked={surfaces.includes('chat-web')}
                  onChange={(e) => {
                    if (e.target.checked) setSurfaces([...surfaces, 'chat-web']);
                    else setSurfaces(surfaces.filter(s => s !== 'chat-web'));
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
        <div className="glass p-6 rounded-xl border border-zinc-800 flex flex-col gap-5 bg-zinc-950/20">
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
              <span className="text-zinc-500">Total Escrow Budget</span>
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
              I accept the Molfi Advertising Terms of Service and understand that the campaign budget is immediately debited from my Web3 wallet and held in escrow by the smart contract.
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
              className="flex-1 bg-purple-600 py-3 rounded-lg text-xs font-bold text-white hover:bg-purple-500 flex items-center justify-center gap-1.5 uppercase transition-all"
            >
              <Send className="h-3.5 w-3.5" /> Deploy Escrow Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
