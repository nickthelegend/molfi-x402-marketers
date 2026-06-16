'use client';

import React, { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getNonce, verifySiwe } from '../../lib/api';
import { useMarketerStore } from '../../store/marketerStore';

export default function Login() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { token, setSession } = useMarketerStore();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  const handleLogin = async () => {
    if (!address || !isConnected) return;
    setLoading(true);
    setError(null);

    try {
      const nonce = await getNonce(address);
      const domain = typeof window !== 'undefined' ? window.location.host : 'localhost:3002';
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';

      const siweMessage = `${domain} wants you to sign in with your Ethereum account:
${address.toLowerCase()}

URI: ${origin}
Version: 1
Chain ID: 43113
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

      const signature = await signMessageAsync({ message: siweMessage });
      const result = await verifySiwe(siweMessage, signature);
      
      setSession(result.sessionJwt, result.walletAddress);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'SIWE authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text dot-grid flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl glass p-8 border-2 border-border shadow-2xl relative overflow-hidden">
        
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_20px_var(--accent)]" />

        <div className="text-center mb-8">
          <svg className="h-10 w-10 text-accent mx-auto mb-4 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22L12 17L22 22L12 2Z" fill="currentColor" />
          </svg>
          <h1 className="text-2xl font-bold tracking-tight headline">Sign in to Marketers</h1>
          <p className="text-xs text-text-muted mt-2">Connect wallet to authorize and access your campaigns dashboard</p>
        </div>

        {error && (
          <div className="mb-4 text-xs text-danger rounded-lg border border-danger/20 bg-danger/5 p-3 font-semibold">
            ⚠️ {error}
          </div>
        )}

        <div className="flex flex-col gap-4 items-center">
          <ConnectButton showBalance={false} chainStatus="icon" />

          {isConnected && address && (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full mt-4 pill-accent py-3 text-sm font-bold transition-all hover:scale-105 hover:brightness-110 shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying Signature...' : 'Sign SIWE Message'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
