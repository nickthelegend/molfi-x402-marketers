'use client';

import React, { useEffect, useState } from 'react';
import { useMarketerStore } from '../../../store/marketerStore';
import { apiRequest, withdrawBalance, fetchLedger, fetchProfile } from '../../../lib/api';
import { useWalletClient, useAccount } from 'wagmi';
import { useTxModal } from '../../../components/tx/TxModalProvider';
import { keccak256, stringToHex } from 'viem';
import { Coins, ArrowUpRight, ArrowDownLeft, ExternalLink, Calendar } from 'lucide-react';

export default function Billing() {
  const { token, balanceUsdc, setBalance } = useMarketerStore();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { show: showTxModal } = useTxModal();

  const [topupAmount, setTopupAmount] = useState('5.00');
  const [withdrawAmount, setWithdrawAmount] = useState('2.00');

  const [topupLoading, setTopupLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const loadLedger = async () => {
    if (!token) return;
    setLedgerLoading(true);
    try {
      const res = await fetchLedger(token);
      setLedger(res.ledger || []);

      const profile = await fetchProfile(token);
      setBalance(profile.balanceUsdc);
    } catch (err) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [token]);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !walletClient || !address) {
      setError('Please connect your wallet first.');
      return;
    }

    setTopupLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amount = parseFloat(topupAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid positive USDC amount.');
      }

      // Step 1: Hit topup endpoint without payment header to get HTTP 402 rejects schema
      const res = await apiRequest('/v1/marketers/billing/topup-quote', 'POST', { amountUsdc: amount.toFixed(6) }, token);
      
      if (res.status !== 402) {
        throw new Error('Expected HTTP 402 Payment Required redirect.');
      }

      const errorJson = await res.json();
      const accepts = errorJson.accepts?.[0];
      if (!accepts) {
        throw new Error('Facilitator rejects payload missing from 402 body.');
      }

      const { maxAmountRequired, payTo, asset, extra } = accepts;
      
      const nonce = keccak256(stringToHex(`nonce-${Date.now()}-${Math.random()}`));
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 300; // 5 mins expiry

      const domain = {
        name: extra?.name || 'USD Coin',
        version: extra?.version || '2',
        chainId: 43113,
        verifyingContract: asset as `0x${string}`,
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };

      // Step 2: Request user wallet signature
      console.log('Signing EIP-3009 transfer authorization signature...');
      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: address,
          to: payTo as `0x${string}`,
          value: BigInt(maxAmountRequired),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce,
        },
      });

      // Step 3: Wrap signature package and send to retry topup
      const xPaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'avalanche-fuji',
        payload: {
          signature,
          authorization: {
            from: address,
            to: payTo,
            value: maxAmountRequired,
            validAfter,
            validBefore,
            nonce,
          },
        },
      };

      const xPaymentBase64 = Buffer.from(JSON.stringify(xPaymentPayload)).toString('base64');

      console.log('Retrying topup with X-PAYMENT authorization signature header...');
      const retryRes = await apiRequest('/v1/marketers/billing/topup', 'POST', { amountUsdc: amount.toFixed(6) }, token, {
        'X-PAYMENT': xPaymentBase64,
      });

      if (!retryRes.ok) {
        const errJson = await retryRes.json();
        throw new Error(errJson.error || 'Payment validation failed');
      }

      const receiptData = await retryRes.json() as { success: boolean; txHash: string };
      
      // Update local balance
      setBalance((parseFloat(balanceUsdc) + amount).toFixed(6));

      // Trigger global tx modal
      showTxModal({
        hash: receiptData.txHash,
        status: 'pending',
        network: 'avalanche-fuji',
        label: `USDC Top-up · ${amount.toFixed(2)} USDC`,
      });

      setSuccess(`Deposit of ${amount.toFixed(2)} USDC successfully submitted on-chain!`);
      loadLedger();
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Top-up transaction failed.');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setWithdrawLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid positive USDC amount.');
      }

      const res = await withdrawBalance(token, amount.toFixed(6));
      
      // Update balance
      setBalance((parseFloat(balanceUsdc) - amount).toFixed(6));

      // Trigger global tx modal
      showTxModal({
        hash: res.txHash,
        status: 'pending',
        network: 'avalanche-fuji',
        label: `USDC Withdrawal · ${amount.toFixed(2)} USDC`,
      });

      setSuccess(`Withdrawal of ${amount.toFixed(2)} USDC successfully completed on-chain!`);
      loadLedger();
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Withdrawal failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text headline">Billing & Wallet</h2>
        <p className="text-xs text-text-muted mt-1">Fund your advertiser balance via x402 headers or withdraw campaigns reserves.</p>
      </div>

      {/* Available Balance Banner */}
      <div className="rounded-xl border border-border bg-surface-2 p-6 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-text-muted">Available Funding Balance</span>
          <h3 className="text-3xl font-bold text-text font-mono mt-1 flex items-center gap-2">
            <Coins className="h-6 w-6 text-accent" /> {parseFloat(balanceUsdc).toFixed(2)} USDC
          </h3>
        </div>
        <div className="text-xs text-text-muted text-right max-w-xs leading-normal">
          Lock USDC to pay for viewer impressions on Llama 3, DeepSeek, and Claude models.
        </div>
      </div>

      {error && (
        <div className="text-xs text-danger rounded-lg border border-danger/20 bg-danger/5 p-3 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="text-xs text-success rounded-lg border border-success/20 bg-success/5 p-3 font-semibold">
          ✓ {success}
        </div>
      )}

      {/* Deposit & Withdraw panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Deposit Panel */}
        <div className="glass p-6 rounded-xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text mb-2 headline flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-accent" /> Top up Balance
            </h3>
            <p className="text-[10px] text-text-muted mb-4 leading-normal">
              Execute a programmatically signed EIP-3009 transfer to fund your campaign account.
            </p>
          </div>
          <form onSubmit={handleTopup} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-text-dim">Amount (USDC)</label>
              <input
                type="text"
                required
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={topupLoading}
              className="w-full pill-accent py-2.5 text-xs font-bold transition-all hover:brightness-110 uppercase shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50"
            >
              {topupLoading ? 'Signing payment...' : 'Top up balance'}
            </button>
          </form>
        </div>

        {/* Withdraw Panel */}
        <div className="glass p-6 rounded-xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text mb-2 headline flex items-center gap-1.5">
              <ArrowDownLeft className="h-4 w-4 text-accent" /> Withdraw Balance
            </h3>
            <p className="text-[10px] text-text-muted mb-4 leading-normal">
              Transfer funds back to your connected web3 address. Payout processed directly.
            </p>
          </div>
          <form onSubmit={handleWithdraw} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-text-dim">Amount (USDC)</label>
              <input
                type="text"
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="rounded bg-surface-2 border border-border text-text p-2.5 text-xs outline-none focus:border-accent font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={withdrawLoading}
              className="w-full rounded-full border border-border bg-surface hover:bg-surface-2 py-2.5 text-xs font-bold transition-all uppercase cursor-pointer disabled:opacity-50"
            >
              {withdrawLoading ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </form>
        </div>

      </div>

      {/* Ledger Table */}
      <div className="flex flex-col gap-4 mt-6">
        <h3 className="text-sm font-bold text-text headline flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-accent" /> Billing Ledger & Settlement Audit
        </h3>
        
        {ledgerLoading ? (
          <div className="text-xs font-mono text-text-muted py-6">Loading transaction history...</div>
        ) : ledger.length === 0 ? (
          <div className="p-8 border border-border bg-surface rounded-xl text-center text-xs text-text-muted font-mono">
            No billing transactions logged. Complete deposits or watch impressions to generate history.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="p-4 font-bold text-text">Time</th>
                  <th className="p-4 font-bold text-text">Type</th>
                  <th className="p-4 font-bold text-text">Amount</th>
                  <th className="p-4 font-bold text-text">Batch Anchor Transaction</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((item, idx) => (
                  <tr key={idx} className="border-b border-border/40 hover:bg-surface-2/30 transition-all font-mono">
                    <td className="p-4 text-text-muted">{new Date(item.timestamp).toLocaleString()}</td>
                    <td className="p-4 text-text font-semibold capitalize">{item.type.replace('_', ' ')}</td>
                    <td className="p-4 text-accent-2 font-bold font-mono">-{item.amountUsdc} USDC</td>
                    <td className="p-4">
                      {item.txHash ? (
                        <a
                          href={item.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-2 hover:underline transition-all flex items-center gap-1"
                        >
                          {item.txHash.slice(0, 8)}...{item.txHash.slice(-6)} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-text-dim">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
