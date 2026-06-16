import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNonce,
  verifySiwe,
  fetchProfile,
  fetchStats,
  fetchCampaigns,
  createCampaign,
} from '../../lib/api';

describe('api.ts - Marketers API Wrapper functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getNonce sends correct walletAddress and returns nonce string', async () => {
    const mockResponse = { nonce: '87654321' };
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );
    global.fetch = mockFetch;

    const walletAddress = '0x1234567890123456789012345678901234567890';
    const nonce = await getNonce(walletAddress);

    expect(nonce).toBe(mockResponse.nonce);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/marketers/auth/nonce'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      })
    );
  });

  it('verifySiwe sends message and signature and returns sessionJwt credentials', async () => {
    const mockResponse = { sessionJwt: 'mock-session-jwt-token', walletAddress: '0xwallet' };
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );
    global.fetch = mockFetch;

    const message = 'SIWE message';
    const signature = '0xsignature';
    const result = await verifySiwe(message, signature);

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/marketers/auth/verify'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message, signature }),
      })
    );
  });

  it('fetchProfile passes Authorization Bearer token header', async () => {
    const mockProfile = { _id: '0xwallet', name: 'Brand Name', balanceUsdc: '15.000000' };
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      })
    );
    global.fetch = mockFetch;

    const token = 'session-token-123';
    const profile = await fetchProfile(token);

    expect(profile).toEqual(mockProfile);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/marketers/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${token}`,
        }),
      })
    );
  });

  it('createCampaign posts campaign details and deserializes created Campaign record', async () => {
    const mockCampaign = { _id: 'camp-123', status: 'active' };
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCampaign),
      })
    );
    global.fetch = mockFetch;

    const token = 'session-token-123';
    const campaignData = {
      mp4Url: 'https://example.com/video.mp4',
      durationMs: 15000,
      ctaUrl: 'https://molfi.fun',
      bidPerViewUsdc: '0.010000',
      budgetUsdc: '10.000000',
    };

    const campaign = await createCampaign(token, campaignData);

    expect(campaign).toEqual(mockCampaign);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/marketers/campaigns'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${token}`,
        }),
        body: JSON.stringify(campaignData),
      })
    );
  });
});
