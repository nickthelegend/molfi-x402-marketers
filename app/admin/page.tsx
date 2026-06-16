'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMarketerStore } from '../../store/marketerStore';
import {
  fetchAdminQueue,
  approveCampaign,
  rejectCampaign,
  fetchAdminMarketers,
  suspendMarketer,
  fetchAdminStats
} from '../../lib/api';
import { ArrowLeft, Check, X, ShieldAlert, BarChart3, Users, Play, Ban } from 'lucide-react';
import Link from 'next/link';

const ADMIN_WALLETS = ['0x635ee3ee5d1bada3c2ef9b3a4a6c741a8460aebe'];

export default function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const { token } = useMarketerStore();

  const [queue, setQueue] = useState<any[]>([]);
  const [marketers, setMarketers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalImpressions: 0, totalMarketers: 0, totalCampaigns: 0 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Rejection modal state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = address && ADMIN_WALLETS.includes(address.toLowerCase());

  const loadAdminData = async () => {
    if (!token || !isAdmin) return;
    try {
      setLoading(true);
      setError(null);

      const [qData, mData, sData] = await Promise.all([
        fetchAdminQueue(token),
        fetchAdminMarketers(token),
        fetchAdminStats(token)
      ]);

      setQueue(qData || []);
      setMarketers(mData || []);
      setStats(sData || { totalImpressions: 0, totalMarketers: 0, totalCampaigns: 0 });
    } catch (err) {
      console.error(err);
      setError('Failed to load admin queue data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && token) {
      loadAdminData();
    }
  }, [token, address, isConnected]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    try {
      await approveCampaign(token, id);
      setQueue(queue.filter(c => c._id !== id));
      loadAdminData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !rejectId || !rejectReason.trim()) return;

    try {
      await rejectCampaign(token, rejectId, rejectReason);
      setQueue(queue.filter(c => c._id !== rejectId));
      setRejectId(null);
      setRejectReason('');
      loadAdminData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!token) return;
    try {
      await suspendMarketer(token, id, 'Policy violation');
      loadAdminData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-zinc-400">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-white">Wallet Connection Required</h3>
        <p className="text-xs text-zinc-500 mt-1">Please connect your authorized administrator wallet to access this surface.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-zinc-400">
        <ShieldAlert className="h-10 w-10 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white">Forbidden</h3>
        <p className="text-xs text-zinc-500 mt-1">Connected wallet {address?.slice(0, 8)}... is not on the administrator allowlist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white headline">Admin Moderation Console</h2>
          <p className="text-xs text-zinc-500 mt-1">Review pending ad submissions and manage advertiser status.</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-all font-semibold">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="text-xs text-red-400 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          ⚠️ {error}
        </div>
      )}

      {/* Grid: Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-5 rounded-xl border border-zinc-800 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Platform Views</span>
            <h4 className="text-xl font-bold font-mono text-white mt-0.5">{stats.totalImpressions}</h4>
          </div>
        </div>

        <div className="glass p-5 rounded-xl border border-zinc-800 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Registered Marketers</span>
            <h4 className="text-xl font-bold font-mono text-white mt-0.5">{stats.totalMarketers}</h4>
          </div>
        </div>

        <div className="glass p-5 rounded-xl border border-zinc-800 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Play className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Placements Created</span>
            <h4 className="text-xl font-bold font-mono text-white mt-0.5">{stats.totalCampaigns}</h4>
          </div>
        </div>
      </div>

      {/* Campaign Queue Section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-purple-400">Campaign Approvals Queue ({queue.length})</h3>
        
        {loading ? (
          <div className="text-xs text-zinc-500 font-mono">Loading moderation queue...</div>
        ) : queue.length === 0 ? (
          <div className="p-8 border border-zinc-800 bg-zinc-950 rounded-xl text-center text-xs text-zinc-500 font-mono">
            No campaigns pending review. All submissions are current.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {queue.map((item) => (
              <div key={item._id} className="glass p-5 rounded-xl border border-zinc-800 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase">
                      Pending review
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">Advertiser: {item.marketerId.slice(0, 8)}...</p>
                  
                  {/* Creative Preview */}
                  <div className="aspect-video w-full rounded overflow-hidden bg-black border border-zinc-900 flex items-center justify-center my-3">
                    {item.type === 'video' ? (
                      <video src={item.creativeUrl} controls className="h-full w-full object-contain" />
                    ) : (
                      <img src={item.creativeUrl} alt="Placement preview" className="h-full w-full object-contain" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 mt-2">
                    <div>Budget: {parseFloat(item.budgetUsdc).toFixed(2)} USDC</div>
                    <div>Bid / View: {parseFloat(item.bidPerViewUsdc).toFixed(4)} USDC</div>
                    <div className="col-span-2 truncate">CTA: <a href={item.ctaUrl} target="_blank" rel="noopener" className="text-purple-400 hover:underline">{item.ctaUrl}</a></div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-zinc-900">
                  <button
                    onClick={() => handleApprove(item._id)}
                    className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => setRejectId(item._id)}
                    className="flex-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-semibold py-2 text-xs flex items-center justify-center gap-1 border border-rose-500/20 transition-all"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marketers Suspension Queue */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-purple-400">Advertisers Status Control</h3>
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="p-4 font-bold text-zinc-400">Advertiser Wallet</th>
                <th className="p-4 font-bold text-zinc-400">Balance</th>
                <th className="p-4 font-bold text-zinc-400">Status</th>
                <th className="p-4 font-bold text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {marketers.map((m) => (
                <tr key={m._id} className="border-b border-zinc-900 hover:bg-zinc-900/20 transition-all font-mono">
                  <td className="p-4 text-zinc-300 select-all">{m._id}</td>
                  <td className="p-4 text-purple-400 font-bold">{parseFloat(m.balanceUsdc).toFixed(2)} USDC</td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                      m.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {m.status === 'active' ? (
                      <button
                        onClick={() => handleSuspend(m._id)}
                        className="text-rose-400 hover:text-rose-300 font-sans font-bold flex items-center gap-1"
                      >
                        <Ban className="h-3 w-3" /> Suspend Marketer
                      </button>
                    ) : (
                      <span className="text-zinc-500">Suspended</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleRejectSubmit} className="w-full max-w-md glass p-6 rounded-xl border border-zinc-800 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white headline">Specify Rejection Reason</h3>
            <textarea
              required
              rows={3}
              placeholder="e.g. Creative content fails resolution guidelines..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="rounded bg-zinc-950 border border-zinc-800 text-text p-2.5 text-xs outline-none focus:border-purple-500"
            />
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="flex-1 bg-zinc-900 py-2 rounded text-xs font-bold text-zinc-400 hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-rose-600 py-2 rounded text-xs font-bold text-white hover:bg-rose-500 transition-colors"
              >
                Reject campaign
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
