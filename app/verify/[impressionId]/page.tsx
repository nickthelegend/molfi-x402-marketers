'use client';

import React, { useEffect, useState, use } from 'react';
import { verifyImpression } from '../../../lib/api';
import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'wagmi/chains';
import { ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface VerifyData {
  impression: {
    _id: string;
    campaignId: string;
    viewerSessionHash: string;
    watchedMs: number;
    completedAt: string;
    leafHash: string;
    batchId?: number;
    settlementTxHash?: string;
  };
  batch?: {
    _id: number;
    root: string;
    impressionCount: number;
    totalPayoutUsdc: string;
    anchorTxHash: string;
    anchoredAt: string;
  } | null;
  proof: string[];
  snowtraceUrl: string;
  registryAddress: string;
}

const registryAbi = [
  {
    name: 'verifyLeaf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'batchId', type: 'uint256' },
      { name: 'leaf', type: 'bytes32' },
      { name: 'proof', type: 'bytes32[]' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export default function VerifyImpression({ params: paramsPromise }: { params: Promise<{ impressionId: string }> }) {
  const params = use(paramsPromise);
  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const loadImpression = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await verifyImpression(params.impressionId);
      setData(res);
    } catch (err) {
      console.error(err);
      setError('Impression record not found or could not be audited.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImpression();
  }, [params.impressionId]);

  const handleVerifyOnChain = async () => {
    if (!data || data.impression.batchId === undefined) return;
    setVerifyStatus('verifying');
    setVerifyError(null);

    const fujiRpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(fujiRpc),
    });

    try {
      const regAddress = data.registryAddress;
      if (!regAddress || regAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('On-chain ImpressionRegistry is not deployed (operator address is fallback 0x00...00).');
      }

      console.log(`Querying verifyLeaf on-chain at registry contract ${regAddress}...`);
      const isValid = await publicClient.readContract({
        address: regAddress as `0x${string}`,
        abi: registryAbi,
        functionName: 'verifyLeaf',
        args: [
          BigInt(data.impression.batchId),
          data.impression.leafHash as `0x${string}`,
          data.proof as `0x${string}`[],
        ],
      });

      if (isValid) {
        setVerifyStatus('success');
      } else {
        setVerifyStatus('failed');
        setVerifyError('On-chain validation returned false (invalid proof leaf path).');
      }
    } catch (err) {
      console.error(err);
      setVerifyStatus('failed');
      setVerifyError((err as Error).message || 'Failed to verify leaf on-chain');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center font-mono text-xs text-text-muted">
        Loading impression audit proof...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md glass p-8 rounded-xl border border-border">
          <h2 className="text-lg font-bold text-text mb-4">Audit Failed</h2>
          <p className="text-xs text-text-muted mb-6">{error || 'Impression not found.'}</p>
          <a
            href="/"
            className="pill-accent px-6 py-2.5 text-xs font-bold uppercase transition-all hover:scale-105"
          >
            Back Home
          </a>
        </div>
      </div>
    );
  }

  const imp = data.impression;
  const isAnchored = imp.batchId !== undefined;

  return (
    <div className="min-h-screen bg-bg text-text dot-grid pb-24 px-6 pt-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        
        {/* Back Link */}
        <div>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-all font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </a>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-accent animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold text-text headline">Public Auditor Proof</h2>
            <p className="text-xs text-text-muted mt-0.5">Audit and verify impression proofs anchored on-chain.</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass p-6 rounded-xl border border-border flex flex-col gap-4">
          
          {/* Header ID */}
          <div className="flex justify-between items-start pb-4 border-b border-border">
            <div>
              <span className="text-[9px] uppercase font-bold text-text-dim">Impression ID</span>
              <div className="text-xs font-mono font-bold text-text mt-0.5 select-all">{imp._id}</div>
            </div>
            <div>
              <span
                className={`inline-block rounded px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                  isAnchored
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-warning/10 text-warning border border-warning/20'
                }`}
              >
                {isAnchored ? 'Anchored On-Chain' : 'Pending Anchor'}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-text-dim block text-[10px] font-sans">Campaign ID:</span>
              <span className="text-text">{imp.campaignId}</span>
            </div>
            <div>
              <span className="text-text-dim block text-[10px] font-sans">Watched Duration:</span>
              <span className="text-text">{(imp.watchedMs / 1000).toFixed(1)} seconds</span>
            </div>
            <div>
              <span className="text-text-dim block text-[10px] font-sans">Completed At:</span>
              <span className="text-text">{new Date(imp.completedAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-text-dim block text-[10px] font-sans">Viewer Session:</span>
              <span className="text-text text-[10px] truncate block" title={imp.viewerSessionHash}>
                {imp.viewerSessionHash}
              </span>
            </div>
          </div>

          {/* Merkle Leaf Hash */}
          <div className="bg-black/40 p-3 rounded border border-border font-mono text-[10px] text-text-muted">
            <span className="text-text-dim block mb-1">Merkle Leaf Hash:</span>
            <span className="select-all text-accent-2">{imp.leafHash}</span>
          </div>

          {/* Merkle Proof Details (collapsible) */}
          {isAnchored && data.proof.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-text-muted hover:text-text font-semibold font-sans py-1 select-none">
                Show Cryptographic Merkle Proof ({data.proof.length} leaves)
              </summary>
              <div className="mt-2 flex flex-col gap-1.5 p-3 bg-black/50 rounded border border-border font-mono text-[9px] text-text-dim select-all">
                {data.proof.map((p, idx) => (
                  <div key={idx} className="truncate">
                    [{idx}]: {p}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Anchor Block Transaction */}
          {isAnchored && data.batch && (
            <div className="border-t border-border pt-4 mt-2">
              <h4 className="text-xs font-bold text-text mb-2 font-display">Merkle Anchor Details</h4>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-text-muted mb-4">
                <div>Root Hash: {data.batch.root.slice(0, 10)}...</div>
                <div>Batch ID: #{data.batch._id}</div>
                <div>Impressions Count: {data.batch.impressionCount}</div>
                <div>Payout USDC: {parseFloat(data.batch.totalPayoutUsdc).toFixed(2)} USDC</div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleVerifyOnChain}
                  disabled={verifyStatus === 'verifying'}
                  className="w-full rounded bg-accent hover:bg-accent-2 text-white font-bold py-2.5 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${verifyStatus === 'verifying' ? 'animate-spin' : ''}`} />
                  Verify proof on-chain
                </button>

                {verifyStatus === 'success' && (
                  <div className="p-3 bg-success/5 border border-success/35 text-success rounded text-xs flex items-center gap-2 font-semibold font-sans mt-2 animate-bounce">
                    <CheckCircle2 className="h-4 w-4" /> Proof successfully verified against on-chain ImpressionRegistry state!
                  </div>
                )}

                {verifyStatus === 'failed' && (
                  <div className="p-3 bg-danger/5 border border-danger/35 text-danger rounded text-xs flex flex-col gap-1 font-mono mt-2">
                    <span className="font-bold font-sans">❌ On-chain Verification Failed:</span>
                    <span>{verifyError}</span>
                  </div>
                )}

                <a
                  href={data.snowtraceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-block text-center rounded border border-border bg-surface-2 hover:bg-surface-3 text-text font-semibold py-2.5 transition-all text-xs mt-1"
                >
                  Explore Anchor Tx on Snowtrace ↗
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
