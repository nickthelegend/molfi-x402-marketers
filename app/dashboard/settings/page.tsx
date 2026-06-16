'use client';

import React from 'react';
import { useMarketerStore } from '../../../store/marketerStore';

export default function Settings() {
  const { walletAddress } = useMarketerStore();

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text headline">Settings</h2>
        <p className="text-xs text-text-muted mt-1">Configure your marketer profile settings.</p>
      </div>

      <div className="glass p-6 rounded-xl border border-border flex flex-col gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-text-muted">Account ID / Address</span>
          <div className="text-xs font-mono bg-bg p-2.5 rounded border border-border select-all text-text mt-1.5 truncate">
            {walletAddress}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-text-muted">Email Notifications</span>
          <input
            type="email"
            placeholder="notifications@marketer.com"
            disabled
            className="w-full rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none mt-1.5 opacity-55 cursor-not-allowed"
          />
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-text-muted">Network Parameters</span>
          <div className="text-xs font-mono text-text-muted mt-2 flex flex-col gap-1">
            <div>• Chain ID: 43113 (Avalanche Fuji)</div>
            <div>• Target Token: USDC (Decimals: 6)</div>
            <div>• Facilitator Schema: Coinbase x402</div>
          </div>
        </div>
      </div>
    </div>
  );
}
