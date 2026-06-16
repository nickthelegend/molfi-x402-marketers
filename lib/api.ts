const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

export async function apiRequest(
  endpoint: string,
  method = 'GET',
  body?: any,
  token?: string | null,
  headers: Record<string, string> = {}
) {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${backendUrl}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  return res;
}

export async function getNonce(walletAddress: string): Promise<string> {
  const res = await apiRequest('/v1/marketers/auth/nonce', 'POST', { walletAddress });
  if (!res.ok) throw new Error('Failed to fetch SIWE nonce');
  const data = await res.json() as { nonce: string };
  return data.nonce;
}

export async function verifySiwe(message: string, signature: string): Promise<{ sessionJwt: string; walletAddress: string }> {
  const res = await apiRequest('/v1/marketers/auth/verify', 'POST', { message, signature });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'SIWE verification failed' }));
    throw new Error(err.error);
  }
  return await res.json() as { sessionJwt: string; walletAddress: string };
}

export async function fetchProfile(token: string) {
  const res = await apiRequest('/v1/marketers/me', 'GET', null, token);
  if (!res.ok) throw new Error('Failed to fetch marketer profile');
  return await res.json();
}

export async function fetchStats(token: string) {
  const res = await apiRequest('/v1/marketers/stats', 'GET', null, token);
  if (!res.ok) throw new Error('Failed to fetch campaign stats');
  return await res.json();
}

export async function fetchCampaigns(token: string) {
  const res = await apiRequest('/v1/marketers/campaigns', 'GET', null, token);
  if (!res.ok) throw new Error('Failed to fetch campaigns list');
  return await res.json();
}

export async function fetchCampaign(token: string, id: string) {
  const res = await apiRequest(`/v1/marketers/campaigns/${id}`, 'GET', null, token);
  if (!res.ok) throw new Error('Failed to fetch campaign details');
  return await res.json();
}

export async function fetchImpressions(token: string, id: string) {
  const res = await apiRequest(`/v1/marketers/campaigns/${id}/impressions`, 'GET', null, token);
  if (!res.ok) throw new Error('Failed to fetch campaign impressions');
  return await res.json();
}

export async function createCampaign(token: string, data: {
  mp4Url: string;
  durationMs: number;
  ctaUrl: string;
  bidPerViewUsdc: string;
  budgetUsdc: string;
  frequencyCap?: number;
}) {
  const res = await apiRequest('/v1/marketers/campaigns', 'POST', data, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Campaign creation failed' }));
    throw new Error(err.error);
  }
  return await res.json();
}

export async function withdrawBalance(token: string, amountUsdc: string) {
  const res = await apiRequest('/v1/marketers/billing/withdraw', 'POST', { amountUsdc }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Withdrawal failed' }));
    throw new Error(err.error);
  }
  return await res.json() as { success: boolean; txHash: string };
}

export async function verifyImpression(id: string) {
  const res = await apiRequest(`/v1/verify/impression/${id}`, 'GET');
  if (!res.ok) throw new Error('Impression verification failed');
  return await res.json();
}
