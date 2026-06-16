import React from 'react';
import { ArrowRight, BarChart2, ShieldCheck, Zap } from 'lucide-react';

export default function MarketersLanding() {
  return (
    <div className="min-h-screen bg-bg text-text dot-grid pb-24 selection:bg-accent/30">
      {/* Top Navigation */}
      <nav className="flex h-16 items-center justify-between px-6 md:px-12 border-b border-border bg-surface/75 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <svg className="h-6 w-6 text-accent animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22L12 17L22 22L12 2Z" fill="currentColor" />
          </svg>
          <span className="text-xl font-bold tracking-wider text-text font-display">
            MOLFI<span className="text-accent">.</span>MARKETERS
          </span>
        </div>
        <div>
          <a
            href="/login"
            className="pill-accent px-5 py-2 text-xs font-bold transition-all hover:brightness-110 tracking-wide uppercase shadow-lg shadow-accent/20"
          >
            Open Dashboard
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-28 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-dim px-4 py-1.5 text-xs font-semibold text-accent-2 tracking-wide mb-8">
          ● VERIFIABLE ON-CHAIN IMPRESSIONS
        </div>

        <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 leading-none headline">
          Buy Ads with <em className="not-italic text-accent-2">On-Chain</em> Proof
        </h1>

        <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Verify every single video impression. Lock budgets in smart contracts. Earn on-chain rewards. Join Molfi.fun's transparent advertiser network.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/login"
            className="w-full sm:w-auto pill-accent px-8 py-4 text-sm font-bold transition-all hover:scale-105 hover:brightness-110 shadow-lg shadow-accent/30 text-center flex items-center justify-center gap-2"
          >
            Start Advertising <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="http://localhost:3000"
            className="w-full sm:w-auto rounded-full border border-border bg-surface px-8 py-4 text-sm font-semibold text-text hover:border-accent hover:bg-surface-2 transition-all text-center cursor-pointer"
          >
            View Main Chat UI
          </a>
        </div>
      </header>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass p-8 rounded-2xl border-2 border-border hover:border-accent/40 transition-all">
            <ShieldCheck className="h-8 w-8 text-accent mb-4" />
            <h3 className="text-xl font-bold text-text mb-2 headline">Verifiable Proof</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Every video ad play computes a cryptographic leaf hash merged into a batch Merkle root. Proofs are anchored on Avalanche Fuji for auditability.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl border-2 border-border hover:border-accent/40 transition-all">
            <Zap className="h-8 w-8 text-accent mb-4" />
            <h3 className="text-xl font-bold text-text mb-2 headline">USDC x402 Top-ups</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Fund your marketing account balance via coinbase standard x402 payment headers. No manual transfers or approvals needed.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl border-2 border-border hover:border-accent/40 transition-all">
            <BarChart2 className="h-8 w-8 text-accent mb-4" />
            <h3 className="text-xl font-bold text-text mb-2 headline">Transparent Analytics</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Monitor impressions, CTR, total budget spent, and average watch durations on a unified panel. Download full audit sheets.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-text-muted border-t border-border/40 mt-16 pt-8">
        Built for Avalanche India Speedrun June 2026 by Nivesh.
      </footer>
    </div>
  );
}
